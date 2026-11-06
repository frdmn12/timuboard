import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TaskPriority, TaskStatus } from '../task.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const cleanTags = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? [
        ...new Set(
          (value as unknown[])
            .map((t) => (typeof t === 'string' ? t.trim() : t))
            .filter((t) => t !== ''),
        ),
      ]
    : value;

/** Catatan: nilai `null` pada field opsional dilewatkan validasi dan dipakai PATCH untuk mengosongkan field. */
export class CreateTaskDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @ApiProperty({ maxLength: 200, example: 'Rancang halaman beranda' })
  title!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 5000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsEnum(TaskStatus)
  @ApiPropertyOptional({
    enum: TaskStatus,
    enumName: 'TaskStatus',
    description:
      'Kolom awal; bawaan todo. Tugas baru ditaruh di posisi paling bawah kolom.',
  })
  status?: TaskStatus;

  @ApiPropertyOptional({
    type: [String],
    maxItems: 10,
    description:
      'Maks 10 tag (maks 30 karakter per tag); duplikat dan string kosong dibuang.',
  })
  @Transform(cleanTags)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    enum: TaskPriority,
    enumName: 'TaskPriority',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-12-31T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Harus anggota papan (ASSIGNEE_NOT_MEMBER).',
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;
}

/** Perubahan status/posisi hanya lewat POST .../move supaya urutan kolom tetap konsisten. */
export class UpdateTaskDto extends PartialType(
  OmitType(CreateTaskDto, ['status'] as const),
) {}

export class MoveTaskDto {
  @ApiProperty({ enum: TaskStatus, enumName: 'TaskStatus' })
  @IsEnum(TaskStatus)
  status!: TaskStatus;

  /** Indeks tujuan dalam kolom (0 = paling atas). */
  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  position!: number;
}

export class TaskQueryDto {
  @ApiPropertyOptional({ enum: TaskStatus, enumName: 'TaskStatus' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filter penerima tugas.',
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({
    maxLength: 100,
    description:
      'Cari (tanpa membedakan huruf besar/kecil) di judul, deskripsi, dan tag.',
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'true = hanya tugas yang saya sematkan.',
  })
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  pinned?: boolean;
}
