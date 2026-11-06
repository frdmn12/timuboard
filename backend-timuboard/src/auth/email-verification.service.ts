import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { EmailVerificationToken } from './email-verification-token.entity';
import { TokenService } from './token.service';

export type ConsumeResult = {
  status: 'verified' | 'already-used' | 'invalid';
  userId?: string;
};

@Injectable()
export class EmailVerificationService {
  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly repo: Repository<EmailVerificationToken>,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {}

  /** Buat token baru (token lama yang belum dipakai dihapus). Mengembalikan token asli untuk dikirim lewat email. */
  async issue(userId: string, manager?: EntityManager) {
    const repo = manager
      ? manager.getRepository(EmailVerificationToken)
      : this.repo;
    await repo.delete({ userId, usedAt: IsNull() });
    const { raw, hash } = this.tokens.generateOpaqueToken();
    const ttl =
      this.config.getOrThrow<number>('EMAIL_VERIFICATION_TTL_HOURS') *
      3_600_000;
    await repo.save(
      repo.create({
        userId,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + ttl),
        usedAt: null,
      }),
    );
    return raw;
  }

  async consume(raw: string, manager?: EntityManager): Promise<ConsumeResult> {
    const repo = manager
      ? manager.getRepository(EmailVerificationToken)
      : this.repo;
    const token = await repo.findOne({
      where: { tokenHash: this.tokens.hash(raw) },
    });
    if (!token) return { status: 'invalid' };
    if (token.usedAt) return { status: 'already-used', userId: token.userId };
    if (token.expiresAt.getTime() <= Date.now()) return { status: 'invalid' };
    await repo.update({ id: token.id }, { usedAt: new Date() });
    return { status: 'verified', userId: token.userId };
  }
}
