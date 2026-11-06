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
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import {
  MarkedReadDto,
  NotificationPageDto,
  PreferencesResponseDto,
  UnreadCountDto,
} from './dto/notification-response.dto';
import {
  NotificationQueryDto,
  UpdatePreferencesDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

/** Notifikasi dalam aplikasi milik pengguna yang sedang masuk. */
@ApiTags('Notifications')
@ApiSecured()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @ApiOperation({
    summary: 'Daftar notifikasi',
    description:
      'Paginasi cursor ke belakang, terbaru lebih dulu. `limit` bawaan 20 (maks 100). Bila `nextBefore` tidak null, kirim nilainya sebagai `before` untuk halaman berikutnya (lebih lama); null berarti sudah habis. `unread=true` hanya menampilkan yang belum dibaca. `unreadCount` adalah total belum dibaca seluruhnya.',
  })
  @ApiEnvelopeResponse(NotificationPageDto)
  @ApiErrorResponses(400)
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: NotificationQueryDto,
  ): Promise<NotificationPageDto> {
    return this.notifications.list(user.id, query);
  }

  /** Ringan: cocok untuk polling lencana di ikon lonceng. */
  @ApiOperation({
    summary: 'Jumlah notifikasi belum dibaca',
    description: 'Ringan: cocok untuk polling lencana di ikon lonceng.',
  })
  @ApiEnvelopeResponse(UnreadCountDto)
  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthUser): Promise<{ count: number }> {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  @ApiOperation({
    summary: 'Preferensi notifikasi',
    description:
      'Jenis notifikasi mana yang ingin diterima pengguna (semua aktif secara bawaan).',
  })
  @ApiEnvelopeResponse(PreferencesResponseDto)
  @Get('preferences')
  preferences(@CurrentUser() user: AuthUser): Promise<PreferencesResponseDto> {
    return this.notifications.getPreferences(user.id);
  }

  @ApiOperation({
    summary: 'Ubah preferensi notifikasi',
    description: 'Field yang tidak dikirim tidak berubah.',
  })
  @ApiEnvelopeResponse(PreferencesResponseDto)
  @ApiErrorResponses(400)
  @Patch('preferences')
  updatePreferences(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<PreferencesResponseDto> {
    return this.notifications.updatePreferences(user.id, dto);
  }

  @ApiOperation({
    summary: 'Tandai semua sudah dibaca',
    description: '`updated` = jumlah notifikasi yang berubah.',
  })
  @ApiEnvelopeResponse(MarkedReadDto)
  @Post('read-all')
  @HttpCode(200)
  readAll(@CurrentUser() user: AuthUser): Promise<{ updated: number }> {
    return this.notifications.markAllRead(user.id);
  }

  @ApiOperation({
    summary: 'Tandai satu notifikasi sudah dibaca',
    description:
      'Hanya notifikasi milik sendiri; milik orang lain diperlakukan sebagai tidak ada.\n\nGalat domain: `NOTIFICATION_NOT_FOUND` (404).',
  })
  @ApiUuidParam('id', 'ID notifikasi')
  @ApiNoContentResponse({ description: 'Ditandai dibaca; tanpa isi.' })
  @ApiErrorResponses([
    404,
    'Notifikasi tidak ada atau bukan milik pengguna (`NOTIFICATION_NOT_FOUND`).',
  ])
  @Post(':id/read')
  @HttpCode(204)
  read(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.notifications.markRead(user.id, id);
  }
}
