import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, Repository } from 'typeorm';
import { Board } from '../boards/board.entity';
import { RealtimeEvent } from '../realtime/realtime.events';
import { RealtimePublisher } from '../realtime/realtime-publisher';
import {
  NotificationPageDto,
  NotificationResponseDto,
  PreferencesResponseDto,
} from './dto/notification-response.dto';
import {
  NotificationQueryDto,
  UpdatePreferencesDto,
} from './dto/notification.dto';
import { NotificationPreference } from './notification-preference.entity';
import {
  Notification,
  NotificationType,
  type NotificationData,
} from './notification.entity';

const DEFAULTS = {
  assigned: true,
  comment: true,
  review: true,
  boardAdded: true,
};
const PREF_FOR: Record<NotificationType, keyof typeof DEFAULTS> = {
  [NotificationType.TASK_ASSIGNED]: 'assigned',
  [NotificationType.COMMENT_ADDED]: 'comment',
  [NotificationType.REVIEW_REQUESTED]: 'review',
  [NotificationType.BOARD_ADDED]: 'boardAdded',
};
const DEFAULT_LIMIT = 20;

export interface NotifyInput {
  type: NotificationType;
  /** Penerima; pelaku sendiri dan duplikat otomatis dibuang. */
  recipientIds: string[];
  actorId: string;
  boardId: string;
  taskId?: string;
  data?: NotificationData;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private readonly prefs: Repository<NotificationPreference>,
    @InjectRepository(Board) private readonly boards: Repository<Board>,
    private readonly realtime: RealtimePublisher,
  ) {}

  /**
   * Buat notifikasi untuk penerima yang mengaktifkannya. Kegagalan hanya dicatat:
   * aksi utama (membuat komentar, memindah tugas, dst.) tidak boleh gagal karena notifikasi.
   */
  async notify(input: NotifyInput): Promise<void> {
    try {
      const recipients = [...new Set(input.recipientIds)].filter(
        (id) => id !== input.actorId,
      );
      if (!recipients.length) return;

      const key = PREF_FOR[input.type];
      const off = new Set(
        (await this.prefs.find({ where: { userId: In(recipients) } }))
          .filter((p) => !p[key])
          .map((p) => p.userId),
      );
      const targets = recipients.filter((id) => !off.has(id));
      if (!targets.length) return;

      const board = await this.boards.findOne({
        where: { id: input.boardId },
        select: { id: true, name: true },
      });
      const data: NotificationData = {
        ...(board && { boardName: board.name }),
        ...input.data,
      };
      await this.repo.insert(
        targets.map((recipientId) => ({
          recipientId,
          actorId: input.actorId,
          type: input.type,
          boardId: input.boardId,
          taskId: input.taskId ?? null,
          data,
        })),
      );
      // Dorong ke room pribadi; klien cukup memuat ulang hitungan/daftar notifikasi.
      this.realtime.toUsers(targets, RealtimeEvent.NOTIFICATION_NEW, {
        type: input.type,
      });
    } catch (err) {
      this.logger.error(
        `Gagal membuat notifikasi ${input.type}`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  async list(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<NotificationPageDto> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const rows = await this.repo.find({
      where: {
        recipientId: userId,
        ...(query.unread && { readAt: IsNull() }),
        ...(query.before && { createdAt: LessThan(query.before) }),
      },
      relations: { actor: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: limit + 1,
    });
    const page = rows.slice(0, limit);
    return {
      items: page.map((n) => NotificationResponseDto.from(n)),
      nextBefore: rows.length > limit ? page[page.length - 1].createdAt : null,
      unreadCount: await this.unreadCount(userId),
    };
  }

  unreadCount(userId: string) {
    return this.repo.count({
      where: { recipientId: userId, readAt: IsNull() },
    });
  }

  /** Hanya milik sendiri; milik orang lain tampil sebagai 404. Idempoten. */
  async markRead(userId: string, id: string): Promise<void> {
    const found = await this.repo.exists({
      where: { id, recipientId: userId },
    });
    if (!found)
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Notification not found',
      });
    await this.repo.update(
      { id, recipientId: userId, readAt: IsNull() },
      { readAt: new Date() },
    );
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const res = await this.repo.update(
      { recipientId: userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { updated: res.affected ?? 0 };
  }

  async getPreferences(userId: string): Promise<PreferencesResponseDto> {
    return PreferencesResponseDto.from(
      (await this.prefs.findOne({ where: { userId } })) ?? DEFAULTS,
    );
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<PreferencesResponseDto> {
    const current = (await this.prefs.findOne({ where: { userId } })) ?? {
      ...DEFAULTS,
    };
    const next = {
      ...current,
      ...Object.fromEntries(
        Object.entries(dto).filter(([, v]) => v !== undefined),
      ),
    };
    await this.prefs.upsert(
      {
        userId,
        assigned: next.assigned,
        comment: next.comment,
        review: next.review,
        boardAdded: next.boardAdded,
      },
      ['userId'],
    );
    return PreferencesResponseDto.from(next);
  }
}
