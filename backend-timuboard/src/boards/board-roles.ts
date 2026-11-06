import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';
import { BoardMemberRole } from './board-member.entity';

export const BOARD_ROLES_KEY = 'boardRoles';
/** Batasi route ke peran tertentu di papan. Tanpa dekorator ini, semua anggota boleh. */
export const BoardRoles = (...roles: BoardMemberRole[]) =>
  SetMetadata(BOARD_ROLES_KEY, roles);

export interface Membership {
  boardId: string;
  userId: string;
  role: BoardMemberRole;
}

/** Keanggotaan pengguna pada papan di URL (diisi BoardAccessGuard). */
export const CurrentMembership = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Membership => {
    return ctx.switchToHttp().getRequest<Request & { membership: Membership }>()
      .membership;
  },
);
