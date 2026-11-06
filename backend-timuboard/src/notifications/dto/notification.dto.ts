import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class NotificationQueryDto {
  /** Jumlah per halaman (bawaan 20). */
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** Ambil yang lebih lama dari waktu ini (nilai `nextBefore` halaman sebelumnya). */
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  before?: Date;

  /** Hanya yang belum dibaca. */
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsOptional()
  @IsBoolean()
  unread?: boolean;
}

export class UpdatePreferencesDto {
  @IsOptional() @IsBoolean() assigned?: boolean;
  @IsOptional() @IsBoolean() comment?: boolean;
  @IsOptional() @IsBoolean() review?: boolean;
  @IsOptional() @IsBoolean() boardAdded?: boolean;
}
