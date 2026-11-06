import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsHexadecimal,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ForgotPasswordDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsHexadecimal()
  @Length(64, 64)
  token!: string;

  /** Maks 72 karakter: batas input bcrypt. */
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
