import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Board } from '../boards/board.entity';
import { Task } from '../tasks/task.entity';
import { User } from '../users/user.entity';

export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  COMMENT_ADDED = 'comment_added',
  REVIEW_REQUESTED = 'review_requested',
  BOARD_ADDED = 'board_added',
}

/** Ringkasan isi yang dibekukan saat notifikasi dibuat, agar tetap terbaca walau tugas/papan diganti nama. */
export interface NotificationData {
  taskTitle?: string;
  boardName?: string;
  /** Awal isi komentar (maks 120 karakter). */
  preview?: string;
}

@Entity('notifications')
@Index(['recipientId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'recipient_id' })
  recipientId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient!: User;

  /** Pelaku; null bila akunnya dihapus. */
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor!: User | null;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column({ name: 'board_id', type: 'uuid', nullable: true })
  boardId!: string | null;

  @ManyToOne(() => Board, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'board_id' })
  board!: Board | null;

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId!: string | null;

  @ManyToOne(() => Task, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'task_id' })
  task!: Task | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  data!: NotificationData;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
