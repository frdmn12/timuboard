import { ApiProperty } from '@nestjs/swagger';
import type { User } from '../user.entity';

/** Rujukan ringkas ke pengguna (penerima tugas, penulis komentar, pelaku notifikasi). */
export class UserRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  name!: string;
}

/** Bentuk publik pengguna; tidak pernah memuat passwordHash. */
export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ example: 'Dewi Lestari' })
  name!: string;
  @ApiProperty({ format: 'email' })
  email!: string;
  @ApiProperty()
  emailVerified!: boolean;
  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  static from(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: !!user.emailVerifiedAt,
      createdAt: user.createdAt,
    };
  }
}
