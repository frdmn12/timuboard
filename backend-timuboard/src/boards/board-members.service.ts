import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeEvent } from '../realtime/realtime.events';
import { RealtimePublisher } from '../realtime/realtime-publisher';
import { UsersService } from '../users/users.service';
import { BoardMember, BoardMemberRole } from './board-member.entity';
import { Board } from './board.entity';
import { MemberResponseDto } from './dto/board-response.dto';
import { AddMemberDto, UpdateMemberDto } from './dto/member.dto';

@Injectable()
export class BoardMembersService {
  constructor(
    @InjectRepository(BoardMember)
    private readonly members: Repository<BoardMember>,
    @InjectRepository(Board) private readonly boards: Repository<Board>,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimePublisher,
  ) {}

  async list(boardId: string): Promise<MemberResponseDto[]> {
    const ownerId = await this.ownerOf(boardId);
    const rows = await this.members.find({
      where: { boardId },
      relations: { user: true },
      order: { joinedAt: 'ASC' },
    });
    return rows.map((m) => MemberResponseDto.from(m, ownerId));
  }

  /** Menambah pengguna yang sudah punya akun berdasarkan email. */
  async add(
    boardId: string,
    actorId: string,
    dto: AddMemberDto,
  ): Promise<MemberResponseDto> {
    const user = await this.users.findByEmail(dto.email);
    if (!user)
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'No account with that email. Ask them to sign up first.',
      });
    if (await this.members.exists({ where: { boardId, userId: user.id } })) {
      throw new ConflictException({
        code: 'ALREADY_MEMBER',
        message: 'This user is already a member',
      });
    }
    await this.members.save(
      this.members.create({
        boardId,
        userId: user.id,
        role: dto.role ?? BoardMemberRole.MEMBER,
      }),
    );
    await this.notifications.notify({
      type: NotificationType.BOARD_ADDED,
      recipientIds: [user.id],
      actorId,
      boardId,
    });
    const member = await this.get(boardId, user.id);
    this.realtime.toBoard(boardId, RealtimeEvent.MEMBER_ADDED, actorId, {
      member,
    });
    return member;
  }

  async updateRole(
    boardId: string,
    userId: string,
    dto: UpdateMemberDto,
    actorId: string,
  ): Promise<MemberResponseDto> {
    if (userId === (await this.ownerOf(boardId))) {
      throw new ForbiddenException({
        code: 'OWNER_ROLE_LOCKED',
        message: "The owner's role cannot be changed",
      });
    }
    const res = await this.members.update(
      { boardId, userId },
      { role: dto.role },
    );
    if (!res.affected) throw this.notMember();
    const member = await this.get(boardId, userId);
    this.realtime.toBoard(boardId, RealtimeEvent.MEMBER_UPDATED, actorId, {
      member,
    });
    return member;
  }

  /** Admin boleh mengeluarkan siapa pun kecuali pemilik; anggota boleh keluar sendiri. */
  async remove(
    boardId: string,
    userId: string,
    actor: { userId: string; role: BoardMemberRole },
  ): Promise<void> {
    if (userId !== actor.userId && actor.role !== BoardMemberRole.ADMIN) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_BOARD_ROLE',
        message: 'You do not have permission for this action',
      });
    }
    if (userId === (await this.ownerOf(boardId))) {
      throw new BadRequestException({
        code: 'OWNER_CANNOT_LEAVE',
        message: 'The owner cannot leave; delete the board instead',
      });
    }
    const res = await this.members.delete({ boardId, userId });
    if (!res.affected) throw this.notMember();
    // Kabari seisi room (termasuk yang dikeluarkan), baru cabut akses socket-nya.
    this.realtime.toBoard(boardId, RealtimeEvent.MEMBER_REMOVED, actor.userId, {
      userId,
    });
    this.realtime.removeUserFromBoard(boardId, userId);
  }

  private async get(boardId: string, userId: string) {
    const m = await this.members.findOneOrFail({
      where: { boardId, userId },
      relations: { user: true },
    });
    return MemberResponseDto.from(m, await this.ownerOf(boardId));
  }

  private async ownerOf(boardId: string) {
    const board = await this.boards.findOneOrFail({
      where: { id: boardId },
      select: { id: true, ownerId: true },
    });
    return board.ownerId;
  }

  private notMember() {
    return new NotFoundException({
      code: 'MEMBER_NOT_FOUND',
      message: 'Member not found',
    });
  }
}
