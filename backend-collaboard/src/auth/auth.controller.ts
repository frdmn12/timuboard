import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiEnvelopeResponse,
  ApiErrorResponses,
} from '../common/swagger/api-envelope.decorator';
import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import {
  LoginResponseDto,
  MessageResponseDto,
  RefreshResponseDto,
  RegisterResponseDto,
} from './dto/auth-response.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto, VerifyEmailDto } from './dto/verify-email.dto';
import { SessionsService } from './sessions.service';

export const REFRESH_COOKIE = 'refresh_token';

/** PRD: maksimal 10 permintaan per menit per IP untuk endpoint auth. */
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Public()
@ApiTags('Auth')
@ApiErrorResponses(429)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionsService,
    private readonly config: ConfigService,
  ) {}

  @ApiOperation({
    summary: 'Daftar akun baru',
    description:
      'Membuat akun dan mengirim email verifikasi (tautan berlaku sesuai EMAIL_VERIFICATION_TTL_HOURS). Akun belum bisa login sebelum email diverifikasi. Bila pengiriman email gagal, akun tetap dibuat dan `verificationEmailSent` = false; minta ulang lewat `POST /auth/resend-verification`.\n\nGalat domain: `EMAIL_ALREADY_REGISTERED` (409).',
  })
  @ApiEnvelopeResponse(RegisterResponseDto, {
    status: 201,
    description: 'Akun dibuat.',
  })
  @ApiErrorResponses(400, [
    409,
    'Email sudah terdaftar (`EMAIL_ALREADY_REGISTERED`).',
  ])
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.auth.register(dto);
  }

  @ApiOperation({
    summary: 'Login',
    description:
      'Menukar email + kata sandi dengan access token JWT (di body) dan refresh token (cookie httpOnly `refresh_token`, header `Set-Cookie`). Kirim access token sebagai `Authorization: Bearer`.\n\nGalat domain: `INVALID_CREDENTIALS` (401, email atau kata sandi salah; pesannya sama untuk email tak terdaftar), `EMAIL_NOT_VERIFIED` (403, email belum diverifikasi).',
  })
  @ApiEnvelopeResponse(LoginResponseDto, {
    description: 'Login berhasil; cookie refresh token dipasang.',
    headers: {
      'Set-Cookie': {
        description:
          'Refresh token baru: cookie httpOnly `refresh_token`, path `/auth`, SameSite=Strict, Secure di production, umur sesuai REFRESH_TOKEN_TTL_DAYS.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiErrorResponses(
    400,
    [401, 'Email atau kata sandi salah (`INVALID_CREDENTIALS`).'],
    [403, 'Email belum diverifikasi (`EMAIL_NOT_VERIFIED`).'],
  )
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { response, refreshToken } = await this.auth.login(
      dto,
      req.get('user-agent') ?? null,
    );
    this.setRefreshCookie(res, refreshToken);
    return response;
  }

  @ApiOperation({
    summary: 'Login/daftar dengan Google',
    description:
      'Menukar ID token Google (`credential` dari Google Identity Services) dengan sesi yang sama seperti `POST /auth/login`. Akun baru dibuat otomatis; akun dengan email sama ditautkan.\n\nGalat domain: `INVALID_GOOGLE_TOKEN` (401), `GOOGLE_EMAIL_NOT_VERIFIED` (401).',
  })
  @ApiEnvelopeResponse(LoginResponseDto, {
    description: 'Login berhasil; cookie refresh token dipasang.',
  })
  @ApiErrorResponses(400, [
    401,
    'Token Google tidak valid / email belum terverifikasi.',
  ])
  @Post('google')
  @HttpCode(200)
  async google(
    @Body() dto: GoogleLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { response, refreshToken } = await this.auth.loginWithGoogle(
      dto.credential,
      req.get('user-agent') ?? null,
    );
    this.setRefreshCookie(res, refreshToken);
    return response;
  }

  @ApiOperation({
    summary: 'Perbarui access token',
    description:
      'Memakai cookie `refresh_token` (dikirim otomatis browser ke path `/auth`; pakai `credentials: include` pada fetch lintas origin). Refresh token dirotasi: cookie baru dikirim lewat `Set-Cookie`. Memakai ulang token lama dianggap pencurian dan mencabut semua sesi pengguna. Pada galat, cookie dihapus.\n\nGalat domain: `REFRESH_TOKEN_MISSING` (401, cookie tidak ada), `INVALID_REFRESH_TOKEN` (401, token tidak dikenal, kedaluwarsa, atau sudah dicabut).',
  })
  @ApiCookieAuth('refresh-cookie')
  @ApiEnvelopeResponse(RefreshResponseDto, {
    description: 'Access token baru; cookie refresh token dirotasi.',
    headers: {
      'Set-Cookie': {
        description:
          'Refresh token baru: cookie httpOnly `refresh_token`, path `/auth`, SameSite=Strict, Secure di production, umur sesuai REFRESH_TOKEN_TTL_DAYS.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiErrorResponses([
    401,
    'Cookie tidak ada (`REFRESH_TOKEN_MISSING`) atau token tidak valid (`INVALID_REFRESH_TOKEN`).',
  ])
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponseDto> {
    const raw = (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_COOKIE
    ];
    if (!raw)
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_MISSING',
        message: 'Not signed in',
      });
    try {
      const { response, refreshToken } = await this.auth.refresh(
        raw,
        req.get('user-agent') ?? null,
      );
      this.setRefreshCookie(res, refreshToken);
      return response;
    } catch (err) {
      this.clearRefreshCookie(res);
      throw err;
    }
  }

  @ApiOperation({
    summary: 'Logout',
    description:
      'Mencabut sesi milik cookie `refresh_token` (bila ada) dan menghapus cookie lewat `Set-Cookie` kedaluwarsa. Idempoten: tanpa cookie pun tetap 200. Access token yang sudah terbit tetap berlaku sampai kedaluwarsa (stateless).',
  })
  @ApiCookieAuth('refresh-cookie')
  @ApiEnvelopeResponse(MessageResponseDto, {
    description: 'Sesi dicabut; cookie dihapus.',
    headers: {
      'Set-Cookie': {
        description:
          'Penghapusan cookie `refresh_token` (path `/auth`, kedaluwarsa di masa lalu).',
        schema: { type: 'string' },
      },
    },
  })
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponseDto> {
    const result = await this.auth.logout(
      (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE],
    );
    this.clearRefreshCookie(res);
    return result;
  }

  @ApiOperation({
    summary: 'Verifikasi email',
    description:
      'Menukar token 64 karakter heksadesimal dari tautan email verifikasi. Idempoten: tautan yang diklik dua kali tetap sukses selama akun sudah terverifikasi.\n\nGalat domain: `INVALID_OR_EXPIRED_TOKEN` (400).',
  })
  @ApiEnvelopeResponse(MessageResponseDto, {
    description: 'Email terverifikasi.',
  })
  @ApiErrorResponses([
    400,
    'Validasi gagal atau token tidak valid/kedaluwarsa (`INVALID_OR_EXPIRED_TOKEN`).',
  ])
  @Post('verify-email')
  @HttpCode(200)
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<MessageResponseDto> {
    return this.auth.verifyEmail(dto.token);
  }

  @ApiOperation({
    summary: 'Kirim ulang email verifikasi',
    description:
      'Jawaban selalu sama (tidak membocorkan apakah email terdaftar atau sudah terverifikasi). Dibatasi 3 permintaan/menit.',
  })
  @ApiEnvelopeResponse(MessageResponseDto, { description: 'Jawaban generik.' })
  @ApiErrorResponses(400)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('resend-verification')
  @HttpCode(200)
  resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<MessageResponseDto> {
    return this.auth.resendVerification(dto.email);
  }

  @ApiOperation({
    summary: 'Minta tautan atur ulang kata sandi',
    description:
      'Jawaban selalu sama (tidak membocorkan apakah email terdaftar). Bila terdaftar, email berisi tautan sekali pakai (PASSWORD_RESET_TTL_MINUTES). Dibatasi 3 permintaan/menit.',
  })
  @ApiEnvelopeResponse(MessageResponseDto, { description: 'Jawaban generik.' })
  @ApiErrorResponses(400)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    return this.auth.forgotPassword(dto.email);
  }

  @ApiOperation({
    summary: 'Atur ulang kata sandi',
    description:
      'Mengganti kata sandi memakai token dari email dan mencabut semua sesi aktif pengguna. Token sekali pakai.\n\nGalat domain: `INVALID_OR_EXPIRED_TOKEN` (400).',
  })
  @ApiEnvelopeResponse(MessageResponseDto, {
    description: 'Kata sandi diganti.',
  })
  @ApiErrorResponses([
    400,
    'Validasi gagal atau token tidak valid/sudah dipakai (`INVALID_OR_EXPIRED_TOKEN`).',
  ])
  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  // Cookie hanya terkirim ke /auth, httpOnly (tak terbaca JS), SameSite=Strict, dan Secure di production.
  private cookieOptions(): CookieOptions {
    const secure =
      this.config.get<boolean>('COOKIE_SECURE') ??
      this.config.get<string>('NODE_ENV') === 'production';
    return { httpOnly: true, secure, sameSite: 'strict', path: '/auth' };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      ...this.cookieOptions(),
      maxAge: this.sessions.ttlMs,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }
}
