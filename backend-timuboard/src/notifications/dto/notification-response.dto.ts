import { ApiProperty } from '@nestjs/swagger';
import { UserRefDto } from '../../users/dto/user-response.dto';
import {
  NotificationType,
  type Notification,
  type NotificationData,
} from '../notification.entity';
import type { NotificationPreference } from '../notification-preference.entity';

/** Ringkasan isi yang dibekukan saat notifikasi dibuat. */
export class NotificationDataDto {
  @ApiProperty({ required: false })
  taskTitle?: string;
  @ApiProperty({ required: false })
  boardName?: string;
  /** Awal isi komentar (maks 120 karakter). */
  @ApiProperty({ required: false })
  preview?: string;
}

export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ enum: NotificationType, enumName: 'NotificationType' })
  type!: NotificationType;
  /** Pengguna yang memicu notifikasi; null bila akunnya sudah dihapus. */
  @ApiProperty({ type: UserRefDto, nullable: true })
  actor!: { id: string; name: string } | null;
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  boardId!: string | null;
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  taskId!: string | null;
  @ApiProperty({ type: NotificationDataDto })
  data!: NotificationData;
  @ApiProperty()
  read!: boolean;
  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  static from(n: Notification): NotificationResponseDto {
    return {
      id: n.id,
      type: n.type,
      actor: n.actor ? { id: n.actor.id, name: n.actor.name } : null,
      boardId: n.boardId,
      taskId: n.taskId,
      data: n.data,
      read: n.readAt !== null,
      createdAt: n.createdAt,
    };
  }
}

export class NotificationPageDto {
  /** Terbaru lebih dulu. */
  @ApiProperty({ type: [NotificationResponseDto] })
  items!: NotificationResponseDto[];
  /** Kirim sebagai `before` untuk memuat yang lebih lama; null bila habis. */
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  nextBefore!: Date | null;
  /** Total notifikasi belum dibaca milik pengguna (bukan hanya di halaman ini). */
  @ApiProperty()
  unreadCount!: number;
}

export class PreferencesResponseDto {
  @ApiProperty({ description: 'Tugas ditugaskan kepada saya.' })
  assigned!: boolean;
  @ApiProperty({ description: 'Komentar baru pada tugas saya.' })
  comment!: boolean;
  @ApiProperty({
    description: 'Tugas dipindah ke kolom review (diterima admin papan).',
  })
  review!: boolean;
  @ApiProperty({ description: 'Saya ditambahkan ke papan.' })
  boardAdded!: boolean;

  static from(
    p: Pick<
      NotificationPreference,
      'assigned' | 'comment' | 'review' | 'boardAdded'
    >,
  ): PreferencesResponseDto {
    return {
      assigned: p.assigned,
      comment: p.comment,
      review: p.review,
      boardAdded: p.boardAdded,
    };
  }
}

export class UnreadCountDto {
  @ApiProperty({ example: 3 })
  count!: number;
}

export class MarkedReadDto {
  /** Jumlah notifikasi yang berubah dari belum dibaca menjadi dibaca. */
  @ApiProperty({ example: 3 })
  updated!: number;
}
