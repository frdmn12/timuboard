import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RealtimeEvent } from '../realtime/realtime.events';
import { RealtimePublisher } from '../realtime/realtime-publisher';
import { Task } from '../tasks/task.entity';
import { BoardMember, BoardMemberRole } from './board-member.entity';
import { Board } from './board.entity';
import { BoardResponseDto } from './dto/board-response.dto';
import { CreateBoardDto, UpdateBoardDto } from './dto/board.dto';

type Stats = { members: number; total: number; done: number };

@Injectable()
export class BoardsService {
  constructor(
    @InjectRepository(Board) private readonly boards: Repository<Board>,
    @InjectRepository(BoardMember)
    private readonly members: Repository<BoardMember>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    private readonly dataSource: DataSource,
    private readonly realtime: RealtimePublisher,
  ) {}

  findMembership(boardId: string, userId: string) {
    return this.members.findOne({ where: { boardId, userId } });
  }

  /** Papan baru langsung menjadikan pembuatnya admin (dan pemilik). */
  async create(userId: string, dto: CreateBoardDto): Promise<BoardResponseDto> {
    const board = await this.dataSource.transaction(async (m) => {
      const created = await m.save(
        m.create(Board, {
          name: dto.name,
          description: dto.description ?? null,
          ownerId: userId,
        }),
      );
      await m.save(
        m.create(BoardMember, {
          boardId: created.id,
          userId,
          role: BoardMemberRole.ADMIN,
        }),
      );
      return created;
    });
    return BoardResponseDto.from(board, BoardMemberRole.ADMIN, {
      members: 1,
      total: 0,
      done: 0,
    });
  }

  async listForUser(userId: string): Promise<BoardResponseDto[]> {
    const memberships = await this.members.find({
      where: { userId },
      relations: { board: true },
      order: { joinedAt: 'DESC' },
    });
    const stats = await this.statsFor(memberships.map((m) => m.boardId));
    return memberships.map((m) =>
      BoardResponseDto.from(
        m.board,
        m.role,
        stats.get(m.boardId) ?? { members: 0, total: 0, done: 0 },
      ),
    );
  }

  async get(boardId: string, role: BoardMemberRole): Promise<BoardResponseDto> {
    const board = await this.boards.findOne({ where: { id: boardId } });
    if (!board)
      throw new NotFoundException({
        code: 'BOARD_NOT_FOUND',
        message: 'Board not found',
      });
    const stats = await this.statsFor([boardId]);
    return BoardResponseDto.from(
      board,
      role,
      stats.get(boardId) ?? { members: 0, total: 0, done: 0 },
    );
  }

  async update(
    boardId: string,
    role: BoardMemberRole,
    dto: UpdateBoardDto,
    actorId: string,
  ): Promise<BoardResponseDto> {
    await this.boards.update(
      { id: boardId },
      {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && {
          description: dto.description || null,
        }),
      },
    );
    const board = await this.get(boardId, role);
    this.realtime.toBoard(boardId, RealtimeEvent.BOARD_UPDATED, actorId, {
      board: {
        id: board.id,
        name: board.name,
        description: board.description,
        updatedAt: board.updatedAt,
      },
    });
    return board;
  }

  /** Hanya pemilik yang boleh menghapus papan (beserta seluruh tugas dan anggotanya). */
  async remove(boardId: string, userId: string): Promise<void> {
    const board = await this.boards.findOne({ where: { id: boardId } });
    if (!board)
      throw new NotFoundException({
        code: 'BOARD_NOT_FOUND',
        message: 'Board not found',
      });
    if (board.ownerId !== userId)
      throw new ForbiddenException({
        code: 'NOT_BOARD_OWNER',
        message: 'Only the board owner can delete it',
      });
    await this.boards.delete({ id: boardId });
    this.realtime.toBoard(boardId, RealtimeEvent.BOARD_DELETED, userId);
    this.realtime.closeBoard(boardId);
  }

  private async statsFor(boardIds: string[]): Promise<Map<string, Stats>> {
    const out = new Map<string, Stats>(
      boardIds.map((id) => [id, { members: 0, total: 0, done: 0 }]),
    );
    if (!boardIds.length) return out;
    const [taskRows, memberRows] = await Promise.all([
      this.tasks
        .createQueryBuilder('t')
        .select('t.boardId', 'boardId')
        .addSelect('COUNT(*)', 'total')
        .addSelect(`COUNT(*) FILTER (WHERE t.status = 'done')`, 'done')
        .where('t.boardId IN (:...boardIds)', { boardIds })
        .groupBy('t.boardId')
        .getRawMany<{ boardId: string; total: string; done: string }>(),
      this.members
        .createQueryBuilder('m')
        .select('m.boardId', 'boardId')
        .addSelect('COUNT(*)', 'members')
        .where('m.boardId IN (:...boardIds)', { boardIds })
        .groupBy('m.boardId')
        .getRawMany<{ boardId: string; members: string }>(),
    ]);
    for (const r of taskRows)
      Object.assign(out.get(r.boardId)!, {
        total: Number(r.total),
        done: Number(r.done),
      });
    for (const r of memberRows) out.get(r.boardId)!.members = Number(r.members);
    return out;
  }
}
