import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GoogleLoginDto {
  /** ID token (JWT) dari Google Identity Services. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  credential!: string;
}
