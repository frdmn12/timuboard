import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

/** Pilihan jenis notifikasi dalam aplikasi per pengguna. Tanpa baris = semua aktif. */
@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryColumn({ name: 'user_id' })
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ default: true })
  assigned!: boolean;

  @Column({ default: true })
  comment!: boolean;

  @Column({ default: true })
  review!: boolean;

  @Column({ name: 'board_added', default: true })
  boardAdded!: boolean;
}
