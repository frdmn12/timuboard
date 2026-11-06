import { Inject, Injectable, Logger } from '@nestjs/common';
import { Emitter } from '@socket.io/redis-emitter';
import Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';
import { currentSocketId } from './request-context';
import { boardRoom, userRoom } from './realtime.events';

/**
 * Menyiarkan event ke klien Socket.IO lewat Redis (tanpa bergantung ke gateway),
 * sehingga service mana pun, di instance mana pun, bisa memanggilnya. Kegagalan hanya dicatat:
 * siaran tidak boleh menggagalkan aksi yang sudah tersimpan.
 */
@Injectable()
export class RealtimePublisher {
  private readonly logger = new Logger(RealtimePublisher.name);
  private readonly emitter: Emitter;

  constructor(@Inject(REDIS) redis: Redis) {
    this.emitter = new Emitter(redis);
  }

  /** Kirim ke semua anggota yang sedang membuka papan, kecuali socket pemanggil. */
  toBoard(
    boardId: string,
    event: string,
    actorId: string,
    data: Record<string, unknown> = {},
  ) {
    this.safely(() => {
      let target = this.emitter.to(boardRoom(boardId));
      const except = currentSocketId();
      if (except) target = target.except(except);
      target.emit(event, {
        boardId,
        actorId,
        at: new Date().toISOString(),
        ...data,
      });
    }, event);
  }

  toUsers(
    userIds: string[],
    event: string,
    data: Record<string, unknown> = {},
  ) {
    this.safely(() => {
      for (const id of new Set(userIds))
        this.emitter
          .to(userRoom(id))
          .emit(event, { at: new Date().toISOString(), ...data });
    }, event);
  }

  /** Keluarkan semua socket pengguna dari room papan (anggota dihapus/keluar). */
  removeUserFromBoard(boardId: string, userId: string) {
    this.safely(
      () => this.emitter.in(userRoom(userId)).socketsLeave(boardRoom(boardId)),
      'socketsLeave',
    );
  }

  /** Papan dihapus: bubarkan room. */
  closeBoard(boardId: string) {
    this.safely(
      () =>
        this.emitter.in(boardRoom(boardId)).socketsLeave(boardRoom(boardId)),
      'closeBoard',
    );
  }

  private safely(fn: () => void, label: string) {
    try {
      fn();
    } catch (err) {
      this.logger.error(
        `Gagal menyiarkan ${label}`,
        err instanceof Error ? err.stack : err,
      );
    }
  }
}
