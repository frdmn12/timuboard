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
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { BoardAccessGuard } from './board-access.guard';
import { BoardMemberRole } from './board-member.entity';
import { BoardRoles, CurrentMembership, type Membership } from './board-roles';
import { BoardsService } from './boards.service';
import { BoardResponseDto } from './dto/board-response.dto';
import { CreateBoardDto, UpdateBoardDto } from './dto/board.dto';

@ApiTags('Boards')
@ApiSecured()
@Controller('boards')
export class BoardsController {
  constructor(private readonly boards: BoardsService) {}

  @ApiOperation({
    summary: 'Buat papan',
    description: 'Pengguna menjadi pemilik sekaligus admin papan baru.',
  })
  @ApiEnvelopeResponse(BoardResponseDto, {
    status: 201,
    description: 'Papan dibuat.',
  })
  @ApiErrorResponses(400)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBoardDto,
  ): Promise<BoardResponseDto> {
    return this.boards.create(user.id, dto);
  }

  @ApiOperation({
    summary: 'Daftar papan saya',
    description:
      'Papan yang diikuti pengguna (sebagai admin atau member), terbaru bergabung lebih dulu, lengkap dengan statistik (jumlah anggota/tugas/selesai, progress).',
  })
  @ApiEnvelopeResponse(BoardResponseDto, { isArray: true })
  @Get()
  list(@CurrentUser() user: AuthUser): Promise<BoardResponseDto[]> {
    return this.boards.listForUser(user.id);
  }

  @ApiOperation({
    summary: 'Detail papan',
    description:
      'Semua anggota boleh. `role` pada respons adalah peran pengguna yang meminta.',
  })
  @ApiUuidParam('boardId', 'ID papan')
  @ApiEnvelopeResponse(BoardResponseDto)
  @ApiErrorResponses([
    404,
    'Papan tidak ada atau pengguna bukan anggotanya (`BOARD_NOT_FOUND`).',
  ])
  @Get(':boardId')
  @UseGuards(BoardAccessGuard)
  get(@CurrentMembership() m: Membership): Promise<BoardResponseDto> {
    return this.boards.get(m.boardId, m.role);
  }

  @ApiOperation({
    summary: 'Ubah papan',
    description:
      'Khusus admin papan. Semua field opsional; deskripsi kosong dikosongkan menjadi null.\n\nGalat domain: `BOARD_NOT_FOUND` (404, bukan anggota), `INSUFFICIENT_BOARD_ROLE` (403, member biasa).',
  })
  @ApiUuidParam('boardId', 'ID papan')
  @ApiEnvelopeResponse(BoardResponseDto)
  @ApiErrorResponses(
    400,
    [403, 'Peran kurang: hanya admin papan (`INSUFFICIENT_BOARD_ROLE`).'],
    [
      404,
      'Papan tidak ada atau pengguna bukan anggotanya (`BOARD_NOT_FOUND`).',
    ],
  )
  @Patch(':boardId')
  @UseGuards(BoardAccessGuard)
  @BoardRoles(BoardMemberRole.ADMIN)
  update(
    @CurrentMembership() m: Membership,
    @Body() dto: UpdateBoardDto,
  ): Promise<BoardResponseDto> {
    return this.boards.update(m.boardId, m.role, dto, m.userId);
  }

  @ApiOperation({
    summary: 'Hapus papan',
    description:
      'Menghapus papan beserta seluruh tugas, komentar, dan keanggotaannya. Hanya pemilik papan. Guard mensyaratkan admin (member biasa = 403 `INSUFFICIENT_BOARD_ROLE`), lalu servis memeriksa kepemilikan (admin non-pemilik = 403 `NOT_BOARD_OWNER`).',
  })
  @ApiUuidParam('boardId', 'ID papan')
  @ApiNoContentResponse({ description: 'Papan dihapus; tanpa isi.' })
  @ApiErrorResponses(
    [
      403,
      'Bukan admin (`INSUFFICIENT_BOARD_ROLE`) atau admin yang bukan pemilik (`NOT_BOARD_OWNER`).',
    ],
    [
      404,
      'Papan tidak ada atau pengguna bukan anggotanya (`BOARD_NOT_FOUND`).',
    ],
  )
  @Delete(':boardId')
  @HttpCode(204)
  @UseGuards(BoardAccessGuard)
  @BoardRoles(BoardMemberRole.ADMIN)
  remove(@CurrentMembership() m: Membership): Promise<void> {
    return this.boards.remove(m.boardId, m.userId);
  }
}
