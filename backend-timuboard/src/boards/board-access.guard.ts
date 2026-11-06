import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { BoardMemberRole } from './board-member.entity';
import { BOARD_ROLES_KEY, type Membership } from './board-roles';
import { BoardsService } from './boards.service';

/**
 * Memastikan pengguna adalah anggota papan di `:boardId` dan memiliki peran yang cukup.
 * Bukan anggota = 404 (keberadaan papan tidak dibocorkan); anggota dengan peran kurang = 403.
 */
@Injectable()
export class BoardAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly boards: BoardsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user: AuthUser; membership?: Membership }>();
    const boardId = req.params.boardId;
    if (typeof boardId !== 'string' || !isUUID(boardId)) throw this.notFound();

    const member = await this.boards.findMembership(boardId, req.user.id);
    if (!member) throw this.notFound();

    const roles = this.reflector.getAllAndOverride<
      BoardMemberRole[] | undefined
    >(BOARD_ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (roles?.length && !roles.includes(member.role)) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_BOARD_ROLE',
        message: 'You do not have permission for this action',
      });
    }
    req.membership = { boardId, userId: member.userId, role: member.role };
    return true;
  }

  private notFound() {
    return new NotFoundException({
      code: 'BOARD_NOT_FOUND',
      message: 'Board not found',
    });
  }
}
