import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  signAccessToken(user: { id: string; email: string }) {
    const payload: AccessTokenPayload = { sub: user.id, email: user.email };
    return this.jwt.signAsync(payload);
  }

  /** Token acak buram (bukan JWT): asli dikirim ke klien, hash-nya disimpan di database. */
  generateOpaqueToken() {
    const raw = randomBytes(32).toString('hex');
    return { raw, hash: this.hash(raw) };
  }

  hash(raw: string) {
    return createHash('sha256').update(raw).digest('hex');
  }
}
