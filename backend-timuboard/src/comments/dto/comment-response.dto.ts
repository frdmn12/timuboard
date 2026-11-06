import { ApiProperty } from '@nestjs/swagger';
import { UserRefDto } from '../../users/dto/user-response.dto';
import type { TaskComment } from '../task-comment.entity';

export class CommentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ format: 'uuid' })
  taskId!: string;
  @ApiProperty()
  body!: string;
  /** null bila akun penulis sudah dihapus. */
  @ApiProperty({ type: UserRefDto, nullable: true })
  author!: { id: string; name: string } | null;
  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
  @ApiProperty()
  edited!: boolean;
  /** Hak pengguna yang meminta: hanya penulis yang boleh mengedit. */
  @ApiProperty()
  canEdit!: boolean;
  /** Penulis atau admin papan boleh menghapus. */
  @ApiProperty()
  canDelete!: boolean;

  static from(
    c: TaskComment,
    viewer: { userId: string; isAdmin: boolean },
  ): CommentResponseDto {
    const mine = c.authorId === viewer.userId;
    return {
      id: c.id,
      taskId: c.taskId,
      body: c.body,
      author: c.author ? { id: c.author.id, name: c.author.name } : null,
      createdAt: c.createdAt,
      edited: c.editedAt !== null,
      canEdit: mine,
      canDelete: mine || viewer.isAdmin,
    };
  }
}

export class CommentPageDto {
  /** Urut dari paling lama ke paling baru. */
  @ApiProperty({ type: [CommentResponseDto] })
  items!: CommentResponseDto[];
  /** Kirim sebagai `before` untuk memuat komentar yang lebih lama; null bila sudah habis. */
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  nextBefore!: Date | null;
}
