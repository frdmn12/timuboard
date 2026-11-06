/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Board } from './board.entity';
import { User } from '../users/user.entity';

export enum BoardMemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity('board_members')
@Unique(['boardId', 'userId'])
export class BoardMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'board_id' })
  boardId!: string;

  @ManyToOne(() => Board, (board) => board.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'board_id' })
  board!: Board;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.boardMemberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'enum',
    enum: BoardMemberRole,
    default: BoardMemberRole.MEMBER,
  })
  role!: BoardMemberRole;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt!: Date;
}
