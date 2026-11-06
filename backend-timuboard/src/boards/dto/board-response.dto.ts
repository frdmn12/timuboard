import { ApiProperty } from '@nestjs/swagger';
import type { Board } from '../board.entity';
import { BoardMemberRole, type BoardMember } from '../board-member.entity';

export class BoardResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ example: 'Peluncuran Produk Q4' })
  name!: string;
  @ApiProperty({ type: String, nullable: true })
  description!: string | null;
  @ApiProperty({ format: 'uuid' })
  ownerId!: string;
  /** Peran pengguna yang meminta. */
  @ApiProperty({ enum: BoardMemberRole, enumName: 'BoardMemberRole' })
  role!: BoardMemberRole;
  @ApiProperty()
  memberCount!: number;
  @ApiProperty()
  taskCount!: number;
  @ApiProperty()
  doneCount!: number;
  /** Persentase tugas selesai (0-100). */
  @ApiProperty({ minimum: 0, maximum: 100 })
  progress!: number;
  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  static from(
    board: Board,
    role: BoardMemberRole,
    stats: { members: number; total: number; done: number },
  ): BoardResponseDto {
    return {
      id: board.id,
      name: board.name,
      description: board.description,
      ownerId: board.ownerId,
      role,
      memberCount: stats.members,
      taskCount: stats.total,
      doneCount: stats.done,
      progress: stats.total ? Math.round((stats.done / stats.total) * 100) : 0,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
    };
  }
}

export class MemberResponseDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty({ format: 'email' })
  email!: string;
  @ApiProperty({ enum: BoardMemberRole, enumName: 'BoardMemberRole' })
  role!: BoardMemberRole;
  /** Pemilik papan: perannya terkunci sebagai admin dan tidak bisa keluar. */
  @ApiProperty()
  isOwner!: boolean;
  @ApiProperty({ format: 'date-time' })
  joinedAt!: Date;

  static from(m: BoardMember, ownerId: string): MemberResponseDto {
    return {
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      isOwner: m.userId === ownerId,
      joinedAt: m.joinedAt,
    };
  }
}
