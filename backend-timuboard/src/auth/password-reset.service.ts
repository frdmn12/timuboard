import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { PasswordResetToken } from './password-reset-token.entity';
import { TokenService } from './token.service';

export type ResetConsumeResult =
  | { status: 'ok'; userId: string }
  | { status: 'invalid' };

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly repo: Repository<PasswordResetToken>,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {}

  private repoFor(manager?: EntityManager) {
    return manager ? manager.getRepository(PasswordResetToken) : this.repo;
  }

  /** Token baru; permintaan sebelumnya yang belum dipakai dibatalkan. Mengembalikan token asli untuk email. */
  async issue(userId: string) {
    await this.repo.delete({ userId, usedAt: IsNull() });
    const { raw, hash } = this.tokens.generateOpaqueToken();
    const ttl =
      this.config.getOrThrow<number>('PASSWORD_RESET_TTL_MINUTES') * 60_000;
    await this.repo.save(
      this.repo.create({
        userId,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + ttl),
        usedAt: null,
      }),
    );
    return raw;
  }

  /** Tandai terpakai secara atomik: dua permintaan bersamaan dengan token sama, hanya satu yang lolos. */
  async consume(
    raw: string,
    manager?: EntityManager,
  ): Promise<ResetConsumeResult> {
    const repo = this.repoFor(manager);
    const token = await repo.findOne({
      where: { tokenHash: this.tokens.hash(raw) },
    });
    if (!token || token.usedAt || token.expiresAt.getTime() <= Date.now()) {
      return { status: 'invalid' };
    }
    const claimed = await repo.update(
      { id: token.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );
    return claimed.affected
      ? { status: 'ok', userId: token.userId }
      : { status: 'invalid' };
  }
}
