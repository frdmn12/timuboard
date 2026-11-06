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
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BoardAccessGuard } from '../boards/board-access.guard';
import { CurrentMembership, type Membership } from '../boards/board-roles';
import { CommentsService } from './comments.service';
import { CommentPageDto, CommentResponseDto } from './dto/comment-response.dto';
import {
  CommentQueryDto,
  CreateCommentDto,
  UpdateCommentDto,
} from './dto/comment.dto';

/** Komentar pada tugas; semua route hanya untuk anggota papan. */
@ApiTags('Comments')
@ApiSecured()
@ApiUuidParam('boardId', 'ID papan')
@ApiUuidParam('taskId', 'ID tugas')
@Controller('boards/:boardId/tasks/:taskId/comments')
@UseGuards(BoardAccessGuard)
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @ApiOperation({
    summary: 'Daftar komentar tugas',
    description:
      'Paginasi cursor ke belakang. Halaman pertama berisi komentar terbaru (`limit`, bawaan 50, maks 100); `items` diurut dari paling lama ke paling baru. Bila `nextBefore` tidak null, kirim nilainya sebagai `before` untuk memuat komentar yang lebih lama; null berarti sudah habis.',
  })
  @ApiEnvelopeResponse(CommentPageDto)
  @ApiErrorResponses(400, [
    404,
    'Papan tidak ada/bukan anggota (`BOARD_NOT_FOUND`), tugas tidak ada (`TASK_NOT_FOUND`), atau komentar tidak ada (`COMMENT_NOT_FOUND`).',
  ])
  @Get()
  list(
    @CurrentMembership() m: Membership,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Query() query: CommentQueryDto,
  ): Promise<CommentPageDto> {
    return this.comments.list(m, taskId, query);
  }

  @ApiOperation({
    summary: 'Tambah komentar',
    description:
      'Semua anggota boleh. Penerima tugas dan peserta diskusi sebelumnya mendapat notifikasi `comment_added`. Dibatasi 20 komentar/menit.',
  })
  @ApiEnvelopeResponse(CommentResponseDto, {
    status: 201,
    description: 'Komentar dibuat.',
  })
  @ApiErrorResponses(400, [
    404,
    'Papan tidak ada/bukan anggota (`BOARD_NOT_FOUND`), tugas tidak ada (`TASK_NOT_FOUND`), atau komentar tidak ada (`COMMENT_NOT_FOUND`).',
  ])
  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  create(
    @CurrentMembership() m: Membership,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.comments.create(m, taskId, dto);
  }

  @ApiOperation({
    summary: 'Ubah komentar',
    description:
      'Hanya penulis komentar. Komentar ditandai `edited` bila isinya berubah.\n\nGalat domain: `NOT_COMMENT_AUTHOR` (403).',
  })
  @ApiUuidParam('commentId', 'ID komentar')
  @ApiEnvelopeResponse(CommentResponseDto)
  @ApiErrorResponses(
    400,
    [403, 'Bukan penulis komentar (`NOT_COMMENT_AUTHOR`).'],
    [
      404,
      'Papan tidak ada/bukan anggota (`BOARD_NOT_FOUND`), tugas tidak ada (`TASK_NOT_FOUND`), atau komentar tidak ada (`COMMENT_NOT_FOUND`).',
    ],
  )
  @Patch(':commentId')
  update(
    @CurrentMembership() m: Membership,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.comments.update(m, taskId, commentId, dto);
  }

  @ApiOperation({
    summary: 'Hapus komentar',
    description:
      'Penulis atau admin papan.\n\nGalat domain: `INSUFFICIENT_BOARD_ROLE` (403, member biasa menghapus komentar orang lain).',
  })
  @ApiUuidParam('commentId', 'ID komentar')
  @ApiNoContentResponse({ description: 'Komentar dihapus; tanpa isi.' })
  @ApiErrorResponses(
    [403, 'Bukan penulis maupun admin (`INSUFFICIENT_BOARD_ROLE`).'],
    [
      404,
      'Papan tidak ada/bukan anggota (`BOARD_NOT_FOUND`), tugas tidak ada (`TASK_NOT_FOUND`), atau komentar tidak ada (`COMMENT_NOT_FOUND`).',
    ],
  )
  @Delete(':commentId')
  @HttpCode(204)
  remove(
    @CurrentMembership() m: Membership,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ): Promise<void> {
    return this.comments.remove(m, taskId, commentId);
  }
}
