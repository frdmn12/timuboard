import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

/** Memverifikasi ID token Google (tanda tangan, audience, kedaluwarsa). Dipisah agar mudah di-stub di tes. */
@Injectable()
export class GoogleTokenVerifier {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: ConfigService) {}

  async verify(idToken: string): Promise<GoogleProfile> {
    const audience = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!audience)
      throw new ServiceUnavailableException({
        code: 'GOOGLE_NOT_CONFIGURED',
        message: 'Google sign-in is not configured',
      });
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience });
      const p = ticket.getPayload();
      if (!p?.sub || !p.email) throw new Error('payload tidak lengkap');
      return {
        sub: p.sub,
        email: p.email.toLowerCase(),
        emailVerified: p.email_verified === true,
        name: p.name?.trim() || p.email.split('@')[0],
      };
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_GOOGLE_TOKEN',
        message: 'Invalid Google sign-in',
      });
    }
  }
}
