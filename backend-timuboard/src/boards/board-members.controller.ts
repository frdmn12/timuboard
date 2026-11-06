import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiEnvelopeResponse,
  ApiErrorResponses,
} from '../common/swagger/api-envelope.decorator';
import {
  ApiSecured,
  ApiUuidParam,
} from '../common/swagger/api-secured.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BoardAccessGuard } from './board-access.guard';
import { BoardMemberRole } from './board-member.entity';
import { BoardMembersService } from './board-members.service';
import { BoardRoles, CurrentMembership, type Membership } from './board-roles';
import { MemberResponseDto } from './dto/board-response.dto';
import { AddMemberDto, UpdateMemberDto } from './dto/member.dto';

@ApiTags('Members')
@ApiSecured()
@ApiUuidParam('boardId', 'ID papan')
@Controller('boards/:boardId/members')
@UseGuards(BoardAccessGuard)
export class BoardMembersController {
  constructor(private readonly members: BoardMembersService) {}

  @ApiOperation({
    summary: 'Daftar anggota papan',
    description: 'Semua anggota boleh melihat.',
  })
  @ApiEnvelopeResponse(MemberResponseDto, { isArray: true })
  @ApiErrorResponses([
    404,
    'Papan tidak ada atau pengguna bukan anggotanya (`BOARD_NOT_FOUND`).',
  ])
  @Get()
  list(@CurrentMembership() m: Membership): Promise<MemberResponseDto[]> {
    return this.members.list(m.boardId);
  }

  @ApiOperation({
    summary: 'Tambah anggota',
    description:
      'Khusus admin. Menambahkan pengguna terdaftar lewat email (peran bawaan `member`) dan mengirim notifikasi `board_added`.\n\nGalat domain: `USER_NOT_FOUND` (404, email belum terdaftar), `ALREADY_MEMBER` (409), `INSUFFICIENT_BOARD_ROLE` (403).',
  })
  @ApiEnvelopeResponse(MemberResponseDto, {
    status: 201,
    description: 'Anggota ditambahkan.',
  })
  @ApiErrorResponses(
    400,
    [403, 'Peran kurang: hanya admin papan (`INSUFFICIENT_BOARD_ROLE`).'],
    [
      404,
      'Papan tidak ada/bukan anggota (`BOARD_NOT_FOUND`) atau email belum terdaftar (`USER_NOT_FOUND`).',
    ],
    [409, 'Pengguna sudah menjadi anggota (`ALREADY_MEMBER`).'],
  )
  @Post()
  @BoardRoles(BoardMemberRole.ADMIN)
  add(
    @CurrentMembership() m: Membership,
    @Body() dto: AddMemberDto,
  ): Promise<MemberResponseDto> {
    return this.members.add(m.boardId, m.userId, dto);
  }

  @ApiOperation({
    summary: 'Ubah peran anggota',
    description:
      'Khusus admin. Peran pemilik papan terkunci.\n\nGalat domain: `OWNER_ROLE_LOCKED` (403), `MEMBER_NOT_FOUND` (404), `INSUFFICIENT_BOARD_ROLE` (403).',
  })
  @ApiUuidParam('userId', 'ID pengguna anggota')
  @ApiEnvelopeResponse(MemberResponseDto)
  @ApiErrorResponses(
    400,
    [
      403,
      'Bukan admin (`INSUFFICIENT_BOARD_ROLE`) atau menyasar pemilik (`OWNER_ROLE_LOCKED`).',
    ],
    [
      404,
      'Papan tidak ada/bukan anggota (`BOARD_NOT_FOUND`) atau pengguna bukan anggota (`MEMBER_NOT_FOUND`).',
    ],
  )
  @Patch(':userId')
  @BoardRoles(BoardMemberRole.ADMIN)
  updateRole(
    @CurrentMembership() m: Membership,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberDto,
  ): Promise<MemberResponseDto> {
    return this.members.updateRole(m.boardId, userId, dto, m.userId);
  }

  @ApiOperation({
    summary: 'Keluarkan anggota / keluar dari papan',
    description:
      'Admin boleh mengeluarkan siapa pun kecuali pemilik; anggota biasa hanya boleh mengeluarkan dirinya sendiri (keluar dari papan). Aturan ini diperiksa di servis, bukan di guard peran.\n\nGalat domain: `INSUFFICIENT_BOARD_ROLE` (403, member mengeluarkan orang lain), `OWNER_CANNOT_LEAVE` (400, pemilik tidak boleh keluar; hapus papan), `MEMBER_NOT_FOUND` (404).',
  })
  @ApiUuidParam('userId', 'ID pengguna yang dikeluarkan')
  @ApiNoContentResponse({ description: 'Anggota dikeluarkan; tanpa isi.' })
  @ApiErrorResponses(
    [
      400,
      'Menyasar pemilik papan (`OWNER_CANNOT_LEAVE`) atau UUID tidak valid.',
    ],
    [
      403,
      'Member mencoba mengeluarkan orang lain (`INSUFFICIENT_BOARD_ROLE`).',
    ],
    [
      404,
      'Papan tidak ada/bukan anggota (`BOARD_NOT_FOUND`) atau pengguna bukan anggota (`MEMBER_NOT_FOUND`).',
    ],
  )
  @Delete(':userId')
  @HttpCode(204)
  remove(
    @CurrentMembership() m: Membership,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    return this.members.remove(m.boardId, userId, {
      userId: m.userId,
      role: m.role,
    });
  }
}
