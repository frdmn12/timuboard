import { Transform } from 'class-transformer';
import { IsEmail, IsHexadecimal, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @IsHexadecimal()
  @Length(64, 64)
  token!: string;
}

export class ResendVerificationDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;
}
