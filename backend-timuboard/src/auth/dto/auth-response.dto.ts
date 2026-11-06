// Bentuk `data` saja; ResponseInterceptor membungkusnya jadi { success, data, meta }.
import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class RegisterResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ format: 'email', example: 'dewi.ui@studionusa.id' })
  email!: string;
  /** true bila email verifikasi berhasil dikirim. */
  @ApiProperty()
  verificationEmailSent!: boolean;
  @ApiProperty()
  message!: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token (15 menit bawaan).' })
  accessToken!: string;
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class RefreshResponseDto {
  @ApiProperty({ description: 'JWT access token baru.' })
  accessToken!: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'OK' })
  message!: string;
}
