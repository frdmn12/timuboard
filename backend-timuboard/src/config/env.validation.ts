import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/** Seluruh variabel lingkungan yang dibaca backend. Aplikasi gagal start bila ada yang salah. */
export class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: string = 'development';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString() DB_HOST!: string;
  @Type(() => Number) @IsInt() DB_PORT!: number;
  @IsString() POSTGRES_USER!: string;
  @IsString() POSTGRES_PASSWORD!: string;
  @IsString() POSTGRES_DB!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET minimal 32 karakter' })
  JWT_ACCESS_SECRET!: string;
  @IsString() JWT_ACCESS_TTL: string = '15m';
  @Type(() => Number)
  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_DAYS: number = 7;
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(15)
  SALT_ROUNDS: number = 12;
  @Type(() => Number)
  @IsInt()
  @Min(1)
  EMAIL_VERIFICATION_TTL_HOURS: number = 24;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  PASSWORD_RESET_TTL_MINUTES: number = 60;

  @IsUrl({ require_tld: false })
  FRONTEND_URL: string = 'http://localhost:5173';

  /** Client ID OAuth Google (tipe Web). Tanpa ini, POST /auth/google menjawab 503. */
  @IsOptional() @IsString() GOOGLE_CLIENT_ID?: string;

  @IsString() MAIL_HOST: string = 'localhost';
  @Type(() => Number) @IsInt() MAIL_PORT: number = 1025;
  @IsOptional() @IsString() MAIL_USER?: string;
  @IsOptional() @IsString() MAIL_PASSWORD?: string;
  @IsString() MAIL_FROM: string = 'Timuboard <no-reply@timuboard.local>';
  @IsEmail({}, { each: false }) @IsOptional() MAIL_REPLY_TO?: string;

  /** Hanya untuk tes: mematikan rate limit. Ditolak di production. */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === true || value === 'true',
  )
  THROTTLE_DISABLED?: boolean;

  /** Cookie refresh token hanya dikirim lewat HTTPS. Default: true di production. */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === true || value === 'true',
  )
  COOKIE_SECURE?: boolean;

  /** Swagger UI di /docs. Default: aktif selain di production; di production wajib true untuk menyalakan. */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === true || value === 'true',
  )
  SWAGGER_ENABLED?: boolean;
}

export function validateEnv(config: Record<string, unknown>) {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length) {
    const lines = errors.flatMap((e) =>
      Object.values(e.constraints ?? {}).map((m) => `  - ${m}`),
    );
    throw new Error(`Konfigurasi lingkungan tidak valid:\n${lines.join('\n')}`);
  }
  if (env.NODE_ENV === 'production' && env.THROTTLE_DISABLED) {
    throw new Error(
      'THROTTLE_DISABLED tidak boleh aktif di production (rate limit auth wajib).',
    );
  }
  return env;
}
