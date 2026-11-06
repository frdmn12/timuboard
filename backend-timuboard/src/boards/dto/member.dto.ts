import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { BoardMemberRole } from '../board-member.entity';

export class AddMemberDto {
  @ApiProperty({
    format: 'email',
    description: 'Email pengguna terdaftar yang akan ditambahkan.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    enum: BoardMemberRole,
    enumName: 'BoardMemberRole',
    default: BoardMemberRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(BoardMemberRole)
  role?: BoardMemberRole;
}

export class UpdateMemberDto {
  @ApiProperty({ enum: BoardMemberRole, enumName: 'BoardMemberRole' })
  @IsEnum(BoardMemberRole)
  role!: BoardMemberRole;
}
