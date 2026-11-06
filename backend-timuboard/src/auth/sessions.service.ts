import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { Session } from './session.entity';
import { TokenService } from './token.service';

export interface RotateResult {
  userId: string;
  refreshToken: string;
}

/** Sesi refresh token: berputar (rotasi) tiap dipakai, dengan deteksi pemakaian ulang. */
@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {}

  get ttlMs() {
    return (
      this.config.getOrThrow<number>('REFRESH_TOKEN_TTL_DAYS') * 86_400_000
    );
  }

  async create(userId: string, userAgent: string | null) {
    const { raw, hash } = this.tokens.generateOpaqueToken();
    await this.sessions.save(
      this.sessions.create({
        userId,
        tokenHash: hash,
        userAgent,
        expiresAt: new Date(Date.now() + this.ttlMs),
        revokedAt: null,
      }),
    );
    return raw;
  }

  /** Tukar refresh token lama dengan yang baru. Null bila tidak valid; token yang sudah dicabut dipakai lagi = semua sesi pengguna dicabut. */
  async rotate(
    raw: string,
    userAgent: string | null,
  ): Promise<RotateResult | null> {
    const session = await this.sessions.findOne({
      where: { tokenHash: this.tokens.hash(raw) },
    });
    if (!session) return null;
    if (session.revokedAt) {
      await this.revokeAllForUser(session.userId);
      return null;
    }
    if (session.expiresAt.getTime() <= Date.now()) return null;
    await this.sessions.update({ id: session.id }, { revokedAt: new Date() });
    return {
      userId: session.userId,
      refreshToken: await this.create(session.userId, userAgent),
    };
  }

  async revoke(raw: string) {
    await this.sessions.update(
      { tokenHash: this.tokens.hash(raw), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async revokeAllForUser(userId: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Session) : this.sessions;
    await repo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }
}
