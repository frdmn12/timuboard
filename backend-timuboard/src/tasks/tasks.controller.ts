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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BoardAccessGuard } from '../boards/board-access.guard';
import { CurrentMembership, type Membership } from '../boards/board-roles';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { TaskResponseDto } from './dto/task-response.dto';
import {
  CreateTaskDto,
  MoveTaskDto,
  TaskQueryDto,
  UpdateTaskDto,
} from './dto/task.dto';
import { TasksService } from './tasks.service';

/** Tugas dalam satu papan; semua route hanya untuk anggota papan. */
@ApiTags('Tasks')
@ApiSecured()
@ApiUuidParam('boardId', 'ID papan')
@Controller('boards/:boardId/tasks')
@UseGuards(BoardAccessGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @ApiOperation({
    summary: 'Daftar tugas papan',
    description:
      'Semua tugas papan, diurutkan per kolom (`status`) lalu posisi (`order`). Filter bersifat AND: `status`, `assigneeId`, `q` (cari di judul/deskripsi/tag), `pinned` (hanya yang saya sematkan). Tanpa paginasi.',
  })
  @ApiEnvelopeResponse(TaskResponseDto, { isArray: true })
  @ApiErrorResponses(400, [
    404,
    'Papan tidak ada atau bukan anggota (`BOARD_NOT_FOUND`).',
  ])
  @Get()
  list(
    @CurrentMembership() m: Membership,
    @Query() query: TaskQueryDto,
  ): Promise<TaskResponseDto[]> {
    return this.tasks.list(m.boardId, m.userId, query);
  }

  @ApiOperation({
    summary: 'Buat tugas',
    description:
      'Semua anggota boleh. Tugas baru ditaruh di bawah kolom tujuan (`status`, bawaan `todo`). `progress` bawaan mengikuti kolom. Bila `assigneeId` diisi, penerima mendapat notifikasi `task_assigned`.\n\nGalat domain: `ASSIGNEE_NOT_MEMBER` (400, penerima bukan anggota papan).',
  })
  @ApiEnvelopeResponse(TaskResponseDto, {
    status: 201,
    description: 'Tugas dibuat.',
  })
  @ApiErrorResponses(
    [
      400,
      'Validasi gagal atau penerima bukan anggota papan (`ASSIGNEE_NOT_MEMBER`).',
    ],
    [404, 'Papan tidak ada atau bukan anggota (`BOARD_NOT_FOUND`).'],
  )
  @Post()
  create(
    @CurrentMembership() m: Membership,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasks.create(m.boardId, m.userId, dto);
  }

  @ApiOperation({ summary: 'Detail tugas' })
  @ApiUuidParam('taskId', 'ID tugas')
  @ApiEnvelopeResponse(TaskResponseDto)
  @ApiErrorResponses([
    404,
    'Papan tidak ada/bukan anggota (`BOARD_NOT_FOUND`) atau tugas tidak ada di papan ini (`TASK_NOT_FOUND`).',
  ])
  @Get(':taskId')
  get(
    @CurrentMembership() m: Membership,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<TaskResponseDto> {
    return this.tasks.get(m.boardId, taskId, m.userId);
  }

  @ApiOperation({
    summary: 'Ubah tugas',
    description:
      'Semua field opsional. Kirim `null` pada `description`, `priority`, `dueDate`, atau `assigneeId` untuk mengosongkannya. `status` dan posisi TIDAK bisa diubah di sini (field `status` ditolak 400); gunakan `POST .../move`.\n\nGalat domain: `ASSIGNEE_NOT_MEMBER` (400), `TASK_NOT_FOUND` (404).',
  })
  @ApiUuidParam('taskId', 'ID tugas')
  @ApiEnvelopeResponse(TaskResponseDto)
  @ApiErrorResponses(
    [
      400,
      'Validasi gagal (termasuk field `status`) atau penerima bukan anggota (`ASSIGNEE_NOT_MEMBER`).',
    ],
    [
      404,
      'Papan tidak ada/bukan anggota (`BOARD_NOT_FOUND`) atau tugas tidak ada di papan ini (`TASK_NOT_FOUND`).',
    ],
  )
  @Patch(':taskId')
  update(
    @CurrentMembership() m: Membership,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasks.update(m.boardId, taskId, m.userId, dto);
  }

  @ApiOperation({
    summary: 'Pindahkan tugas (drag & drop)',
    description:
      'Memindahkan tugas ke kolom `status` pada indeks `position` (0 = paling atas; nilai di luar jangkauan dipotong ke paling bawah). Kolom asal dan tujuan dinomori ulang. Pindah maju menaikkan progress ke batas minimal kolom; pindah mundur dari 100 menurunkannya. Memasuki `review` memberi notifikasi `review_requested` ke admin papan.',
  })
  @ApiUuidParam('taskId', 'ID tugas')
  @ApiEnvelopeResponse(TaskResponseDto, {
    description: 'Tugas setelah dipindah.',
  })
  @ApiErrorResponses(400, [
    404,
    'Papan tidak ada/bukan anggota (`BOARD_NOT_FOUND`) atau tugas tidak ada di papan ini (`TASK_NOT_FOUND`).',
  ])
  @Post(':taskId/move')
  @HttpCode(200)
  move(
    @CurrentMembership() m: Membership,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: MoveTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasks.move(m.boardId, taskId, m.userId, dto);
  }

  @ApiOperation({
    summary: 'Hapus tugas',
    description:
      'Semua anggota boleh. Komentar dan notifikasi tugas ikut terhapus.',
  })
  @ApiUuidParam('taskId', 'ID tugas')
  @ApiNoContentResponse({ description: 'Tugas dihapus; tanpa isi.' })
  @ApiErrorResponses([
    404,
    'Papan tidak ada/bukan anggota (`BOARD_NOT_FOUND`) atau tugas tidak ada di papan ini (`TASK_NOT_FOUND`).',
  ])
  @Delete(':taskId')
  @HttpCode(204)
  remove(
    @CurrentMembership() m: Membership,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<void> {
    return this.tasks.remove(m.boardId, taskId, m.userId);
  }

  @ApiOperation({
    summary: 'Sematkan tugas',
    description:
      'Penyematan bersifat pribadi per pengguna dan idempoten (menyematkan ulang tetap 200). Hanya mengubah `pinned` bagi pengguna ini. Status 200 (bukan 201).',
  })
  @ApiUuidParam('taskId', 'ID tugas')
  @ApiEnvelopeResponse(TaskResponseDto, {
    description: 'Tugas dengan `pinned` = true.',
  })
  @ApiErrorResponses([
    404,
    'Papan tidak ada/bukan anggota (`BOARD_NOT_FOUND`) atau tugas tidak ada di papan ini (`TASK_NOT_FOUND`).',
  ])
  @Put(':taskId/pin')
  pin(
    @CurrentMembership() m: Membership,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<TaskResponseDto> {
    return this.tasks.pin(m.boardId, taskId, m.userId);
  }

  @ApiOperation({
    summary: 'Lepas sematan tugas',
    description: 'Idempoten: melepas tugas yang tidak disematkan tetap 204.',
  })
  @ApiUuidParam('taskId', 'ID tugas')
  @ApiNoContentResponse({ description: 'Sematan dilepas; tanpa isi.' })
  @ApiErrorResponses([
    404,
    'Papan tidak ada/bukan anggota (`BOARD_NOT_FOUND`) atau tugas tidak ada di papan ini (`TASK_NOT_FOUND`).',
  ])
  @Delete(':taskId/pin')
  @HttpCode(204)
  unpin(
    @CurrentMembership() m: Membership,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<void> {
    return this.tasks.unpin(m.boardId, taskId, m.userId);
  }
}

/** Tugas lintas papan milik pengguna yang sedang masuk. */
@ApiTags('Tasks')
@ApiSecured()
@Controller('tasks')
export class MyTasksController {
  constructor(private readonly tasks: TasksService) {}

  @ApiOperation({
    summary: 'Tugas yang saya sematkan (lintas papan)',
    description:
      'Dari papan yang masih diikuti pengguna; yang terbaru disematkan lebih dulu.',
  })
  @ApiEnvelopeResponse(TaskResponseDto, { isArray: true })
  @Get('pinned')
  pinned(@CurrentUser() user: AuthUser): Promise<TaskResponseDto[]> {
    return this.tasks.listPinned(user.id);
  }
}
