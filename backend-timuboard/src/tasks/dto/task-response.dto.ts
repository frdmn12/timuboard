import { ApiProperty } from '@nestjs/swagger';
import { UserRefDto } from '../../users/dto/user-response.dto';
import { TaskPriority, TaskStatus, type Task } from '../task.entity';

export class TaskResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ format: 'uuid' })
  boardId!: string;
  @ApiProperty()
  title!: string;
  @ApiProperty({ type: String, nullable: true })
  description!: string | null;
  @ApiProperty({ enum: TaskStatus, enumName: 'TaskStatus' })
  status!: TaskStatus;
  @ApiProperty({ minimum: 0, maximum: 100 })
  progress!: number;
  @ApiProperty({ type: [String], example: ['desain', 'urgent'] })
  tags!: string[];
  @ApiProperty({ enum: TaskPriority, enumName: 'TaskPriority', nullable: true })
  priority!: TaskPriority | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  dueDate!: Date | null;
  @ApiProperty({ type: UserRefDto, nullable: true })
  assignee!: { id: string; name: string } | null;
  /** Posisi dalam kolom status (0 = paling atas). */
  @ApiProperty({ minimum: 0 })
  order!: number;
  /** Disematkan oleh pengguna yang meminta. */
  @ApiProperty()
  pinned!: boolean;
  /** Jumlah komentar pada tugas. */
  @ApiProperty()
  commentCount!: number;
  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  static from(t: Task, pinned: boolean, commentCount = 0): TaskResponseDto {
    return {
      id: t.id,
      boardId: t.boardId,
      title: t.title,
      description: t.description,
      status: t.status,
      progress: t.progress,
      tags: t.tags,
      priority: t.priority,
      dueDate: t.dueDate,
      assignee: t.assignee
        ? { id: t.assignee.id, name: t.assignee.name }
        : null,
      order: t.order,
      pinned,
      commentCount,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }
}
