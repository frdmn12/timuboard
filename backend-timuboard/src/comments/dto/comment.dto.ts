import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCommentDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body!: string;
}

export class UpdateCommentDto extends CreateCommentDto {}

export class CommentQueryDto {
  /** Jumlah komentar per halaman (bawaan 50). */
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** Ambil komentar yang lebih lama dari waktu ini (nilai `nextBefore` halaman sebelumnya). */
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  before?: Date;
}
