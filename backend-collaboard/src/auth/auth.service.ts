import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { DataSource, QueryFailedError } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import {
  LoginResponseDto,
  MessageResponseDto,
  RefreshResponseDto,
  RegisterResponseDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  GoogleTokenVerifier,
  type GoogleProfile,
} from './google-token.verifier';
import { PasswordResetService } from './password-reset.service';
import { EmailVerificationService } from './email-verification.service';
import { SessionsService } from './sessions.service';
import { TokenService } from './token.service';

const PG_UNIQUE_VIOLATION = '23505';
const GENERIC_FORGOT =
  'If that email is registered, a password reset link has been sent.';
const GENERIC_RESEND =
  'If that email is registered and not yet verified, a new verification email has been sent.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /** Hash tiruan agar waktu respons login tidak membedakan email terdaftar atau tidak. */
  private dummyHash?: Promise<string>;

  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
    private readonly sessions: SessionsService,
    private readonly verification: EmailVerificationService,
    private readonly passwordReset: PasswordResetService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly google: GoogleTokenVerifier,
  ) {}

  private get saltRounds() {
    return this.config.getOrThrow<number>('SALT_ROUNDS');
  }

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    if (await this.users.findByEmail(dto.email)) throw this.emailTaken();
    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    let created: {
      user: { id: string; name: string; email: string };
      token: string;
    };
    try {
      // User dan token verifikasi dibuat atomik: tidak ada akun tanpa token.
      created = await this.dataSource.transaction(async (manager) => {
        const user = await this.users.create(
          { name: dto.name, email: dto.email, passwordHash },
          manager,
        );
        return { user, token: await this.verification.issue(user.id, manager) };
      });
    } catch (err) {
      // Dua pendaftaran bersamaan dengan email sama: unique constraint yang menang.
      if (this.isUniqueViolation(err)) throw this.emailTaken();
      throw err;
    }

    const sent = await this.mail.sendVerification(created.user, created.token);
    return {
      id: created.user.id,
      email: created.user.email,
      verificationEmailSent: sent,
      message: sent
        ? 'Registration successful. Check your email to verify your account.'
        : 'Registration successful, but the verification email could not be sent. Request a new one.',
    };
  }

  async login(
    dto: LoginDto,
    userAgent: string | null,
  ): Promise<{ response: LoginResponseDto; refreshToken: string }> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    const valid = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? (await this.getDummyHash()),
    );
    if (!user || !valid)
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Verify your email before signing in',
      });
    }
    return this.startSession(user, userAgent);
  }

  /** Masuk/daftar lewat Google. Akun dicocokkan lewat `sub`, lalu lewat email (ditautkan), atau dibuat baru. */
  async loginWithGoogle(credential: string, userAgent: string | null) {
    const g = await this.google.verify(credential);
    if (!g.emailVerified)
      throw new UnauthorizedException({
        code: 'GOOGLE_EMAIL_NOT_VERIFIED',
        message: 'Your Google email is not verified',
      });

    let user: Awaited<ReturnType<typeof this.resolveGoogleUser>>;
    try {
      user = await this.resolveGoogleUser(g);
    } catch (err) {
      if (!this.isUniqueViolation(err)) throw err;
      // Pembuatan akun bersamaan (login Google lain atau register) memenangkan unique constraint: cari ulang sekali.
      user = await this.resolveGoogleUser(g);
    }
    return this.startSession(user, userAgent);
  }

  /** Satu transaksi: akun, penautan, pengosongan password, dan pencabutan sesi berhasil atau gagal bersama. */
  private resolveGoogleUser(g: GoogleProfile) {
    return this.dataSource.transaction(async (manager) => {
      const existing = await this.users.findForGoogleLogin(
        g.sub,
        g.email,
        manager,
      );
      if (!existing)
        return this.users.create(
          {
            name: g.name,
            email: g.email,
            passwordHash: null,
            googleSub: g.sub,
            emailVerifiedAt: new Date(),
          },
          manager,
        );
      if (existing.googleSub === g.sub) return existing;
      if (existing.googleSub)
        throw new UnauthorizedException({
          code: 'INVALID_GOOGLE_TOKEN',
          message: 'Invalid Google sign-in',
        });

      const wasUnverified = !existing.emailVerifiedAt;
      await this.users.linkGoogle(existing.id, g.sub, wasUnverified, manager);
      if (wasUnverified)
        await this.sessions.revokeAllForUser(existing.id, manager);
      existing.googleSub = g.sub;
      existing.emailVerifiedAt ??= new Date();
      return existing;
    });
  }

  private isUniqueViolation(err: unknown) {
    return (
      err instanceof QueryFailedError &&
      (err.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
    );
  }

  private async startSession(
    user: Parameters<typeof UserResponseDto.from>[0],
    userAgent: string | null,
  ) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.signAccessToken(user),
      this.sessions.create(user.id, userAgent),
    ]);
    return {
      response: { accessToken, user: UserResponseDto.from(user) },
      refreshToken,
    };
  }

  async refresh(
    rawToken: string,
    userAgent: string | null,
  ): Promise<{ response: RefreshResponseDto; refreshToken: string }> {
    const rotated = await this.sessions.rotate(rawToken, userAgent);
    const user = rotated && (await this.users.findById(rotated.userId));
    if (!rotated || !user)
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Session expired, sign in again',
      });
    return {
      response: { accessToken: await this.tokens.signAccessToken(user) },
      refreshToken: rotated.refreshToken,
    };
  }

  async logout(rawToken: string | undefined): Promise<MessageResponseDto> {
    if (rawToken) await this.sessions.revoke(rawToken);
    return { message: 'Signed out' };
  }

  async verifyEmail(rawToken: string): Promise<MessageResponseDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const r = await this.verification.consume(rawToken, manager);
      if (r.status === 'verified')
        await this.users.markEmailVerified(r.userId!, manager);
      return r;
    });
    // Tautan yang diklik dua kali tetap sukses selama akun sudah terverifikasi.
    if (result.status === 'invalid')
      throw new BadRequestException({
        code: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'Verification link is invalid or has expired',
      });
    return { message: 'Email verified. You can now sign in.' };
  }

  /** Selalu menjawab sama agar tidak membocorkan email mana yang terdaftar. */
  async resendVerification(email: string): Promise<MessageResponseDto> {
    const user = await this.users.findByEmail(email);
    if (user && !user.emailVerifiedAt) {
      const token = await this.verification.issue(user.id);
      await this.mail.sendVerification(user, token);
    }
    return { message: GENERIC_RESEND };
  }

  /** Selalu menjawab sama agar tidak membocorkan email mana yang terdaftar. */
  async forgotPassword(email: string): Promise<MessageResponseDto> {
    const user = await this.users.findByEmail(email);
    if (user) {
      const token = await this.passwordReset.issue(user.id);
      await this.mail.sendPasswordReset(user, token);
    }
    return { message: GENERIC_FORGOT };
  }

  /** Token sekali pakai; sukses mengganti kata sandi dan mencabut semua sesi aktif. */
  async resetPassword(
    rawToken: string,
    password: string,
  ): Promise<MessageResponseDto> {
    const passwordHash = await bcrypt.hash(password, this.saltRounds);
    const userId = await this.dataSource.transaction(async (manager) => {
      const r = await this.passwordReset.consume(rawToken, manager);
      if (r.status !== 'ok') return null;
      await this.users.updatePassword(r.userId, passwordHash, manager);
      return r.userId;
    });
    if (!userId) {
      throw new BadRequestException({
        code: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'Reset link is invalid or has expired',
      });
    }
    await this.sessions.revokeAllForUser(userId);
    return { message: 'Password updated. You can now sign in.' };
  }

  private emailTaken() {
    return new ConflictException({
      code: 'EMAIL_ALREADY_REGISTERED',
      message: 'Email already registered',
    });
  }

  private getDummyHash() {
    return (this.dummyHash ??= bcrypt.hash(
      'collaboard-dummy-password',
      this.saltRounds,
    ));
  }
}
