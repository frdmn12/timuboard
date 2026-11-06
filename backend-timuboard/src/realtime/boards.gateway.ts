import { BeforeApplicationShutdown, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import type { Server, Socket } from 'socket.io';
import { AccessTokenPayload } from '../auth/token.service';
import { BoardsService } from '../boards/boards.service';
import { UsersService } from '../users/users.service';
import { RealtimeEvent, boardRoom, userRoom } from './realtime.events';

interface SocketUser {
  id: string;
  name: string;
}
type Ack = { ok: true; presence: SocketUser[] } | { ok: false; code: string };

const MAX_BOARDS_PER_SOCKET = 20;
/** Kursor: rata-rata 30 pesan/detik per socket, lonjakan sesaat sampai 10; kelebihan dibuang diam-diam. */
const CURSOR_RATE_PER_SEC = 30;
const CURSOR_BURST = 10;
/** x = pecahan lebar area papan, y = piksel dari tepi atas; rentang longgar untuk layar berbeda. */
const CURSOR_X = [-0.5, 1.5] as const;
const CURSOR_Y = [-2000, 200_000] as const;

/** `socket.data` bertipe any di Socket.IO; bungkus sekali agar akses selanjutnya bertipe. */
const dataOf = (s: { data: unknown }) =>
  s.data as { user: SocketUser; exp: number };

/**
 * Gateway papan realtime. Koneksi wajib membawa access token (`auth: { token }`);
 * perubahan data tetap lewat REST, gateway hanya mengelola room, presence, dan masa berlaku token.
 */
@WebSocketGateway()
export class BoardsGateway
  implements OnGatewayInit, OnGatewayConnection, BeforeApplicationShutdown
{
  private closing = false;
  private readonly buckets = new WeakMap<
    Socket,
    { tokens: number; at: number }
  >();
  private readonly logger = new Logger(BoardsGateway.name);
  @WebSocketServer() private server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly boards: BoardsService,
  ) {}

  /** Saat shutdown, socket diputus massal; jangan menghitung presence ke Redis yang sedang ditutup. */
  beforeApplicationShutdown() {
    this.closing = true;
  }

  afterInit(server: Server) {
    server.use((socket, next) => {
      void this.authenticate(socket).then(
        () => next(),
        () => next(new Error('UNAUTHORIZED')),
      );
    });
  }

  /** Verifikasi access token dari handshake dan simpan pengguna + waktu kedaluwarsa di `socket.data`. */
  private async authenticate(socket: Socket) {
    const token = (socket.handshake.auth as { token?: unknown } | undefined)
      ?.token;
    if (typeof token !== 'string') throw new Error('no token');
    const payload = await this.jwt.verifyAsync<
      AccessTokenPayload & { exp: number }
    >(token);
    const user = await this.users.findById(payload.sub);
    if (!user) throw new Error('no user');
    Object.assign(dataOf(socket), {
      user: { id: user.id, name: user.name },
      exp: payload.exp,
    });
  }

  async handleConnection(socket: Socket) {
    const user = dataOf(socket).user;
    await socket.join(userRoom(user.id));

    // Token berumur pendek: putuskan saat kedaluwarsa agar klien memperbarui token lalu menyambung ulang.
    const ms = Math.max(0, dataOf(socket).exp * 1000 - Date.now());
    const timer = setTimeout(
      () => {
        socket.emit(RealtimeEvent.AUTH_EXPIRED);
        socket.disconnect(true);
      },
      Math.min(ms, 2 ** 31 - 1),
    );
    socket.on('disconnecting', () => {
      clearTimeout(timer);
      for (const room of socket.rooms) {
        if (room.startsWith('board:')) {
          socket.to(room).emit(RealtimeEvent.CURSOR_HIDE, {
            boardId: room.slice(6),
            socketId: socket.id,
          });
          void this.broadcastPresence(room.slice(6), socket.id);
        }
      }
    });
  }

  @SubscribeMessage('board:join')
  async join(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { boardId?: unknown },
  ): Promise<Ack> {
    const user = dataOf(socket).user;
    const boardId = body?.boardId;
    // Bukan anggota atau id ngawur: jawaban sama agar keberadaan papan tidak bocor.
    if (
      typeof boardId !== 'string' ||
      !isUUID(boardId) ||
      !(await this.boards.findMembership(boardId, user.id))
    ) {
      return { ok: false, code: 'BOARD_NOT_FOUND' };
    }
    const joined = [...socket.rooms].filter((r) => r.startsWith('board:'));
    if (
      !joined.includes(boardRoom(boardId)) &&
      joined.length >= MAX_BOARDS_PER_SOCKET
    )
      return { ok: false, code: 'TOO_MANY_BOARDS' };

    await socket.join(boardRoom(boardId));
    const presence = await this.broadcastPresence(boardId);
    return { ok: true, presence };
  }

  @SubscribeMessage('board:leave')
  async leave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { boardId?: unknown },
  ): Promise<{ ok: boolean }> {
    const boardId = body?.boardId;
    if (typeof boardId !== 'string' || !isUUID(boardId)) return { ok: false };
    socket
      .to(boardRoom(boardId))
      .emit(RealtimeEvent.CURSOR_HIDE, { boardId, socketId: socket.id });
    await socket.leave(boardRoom(boardId));
    await this.broadcastPresence(boardId);
    return { ok: true };
  }

  /**
   * Teruskan posisi kursor ke anggota lain yang membuka papan yang sama. Hanya untuk socket yang sudah
   * bergabung; payload divalidasi dan dibatasi lajunya. Memakai `volatile` karena posisi lama tak berguna.
   */
  @SubscribeMessage('cursor:move')
  cursorMove(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { boardId?: unknown; x?: unknown; y?: unknown },
  ): void {
    const { boardId, x, y } = body ?? {};
    if (
      typeof boardId !== 'string' ||
      !isUUID(boardId) ||
      !socket.rooms.has(boardRoom(boardId))
    )
      return;
    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    )
      return;
    if (
      x < CURSOR_X[0] ||
      x > CURSOR_X[1] ||
      y < CURSOR_Y[0] ||
      y > CURSOR_Y[1]
    )
      return;
    if (!this.allowCursor(socket)) return;
    const { id: userId, name } = dataOf(socket).user;
    socket.to(boardRoom(boardId)).volatile.emit(RealtimeEvent.CURSOR_MOVE, {
      boardId,
      socketId: socket.id,
      userId,
      name,
      x,
      y,
    });
  }

  @SubscribeMessage('cursor:hide')
  cursorHide(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { boardId?: unknown },
  ): void {
    const boardId = body?.boardId;
    if (
      typeof boardId !== 'string' ||
      !isUUID(boardId) ||
      !socket.rooms.has(boardRoom(boardId))
    )
      return;
    socket
      .to(boardRoom(boardId))
      .emit(RealtimeEvent.CURSOR_HIDE, { boardId, socketId: socket.id });
  }

  /** Token bucket per socket. */
  private allowCursor(socket: Socket): boolean {
    const now = Date.now();
    const b = this.buckets.get(socket) ?? { tokens: CURSOR_BURST, at: now };
    b.tokens = Math.min(
      CURSOR_BURST,
      b.tokens + ((now - b.at) / 1000) * CURSOR_RATE_PER_SEC,
    );
    b.at = now;
    const ok = b.tokens >= 1;
    if (ok) b.tokens -= 1;
    this.buckets.set(socket, b);
    return ok;
  }

  /** Daftar pengguna unik yang sedang membuka papan (lintas instance), lalu disiarkan ke room. */
  private async broadcastPresence(
    boardId: string,
    excludeSocketId?: string,
  ): Promise<SocketUser[]> {
    if (this.closing) return [];
    const room = boardRoom(boardId);
    try {
      const sockets = await this.server.in(room).fetchSockets();
      const unique = new Map<string, SocketUser>();
      for (const s of sockets)
        if (s.id !== excludeSocketId)
          unique.set(dataOf(s).user.id, dataOf(s).user);
      const users = [...unique.values()];
      this.server
        .to(room)
        .except(excludeSocketId ?? '')
        .emit(RealtimeEvent.PRESENCE_UPDATE, { boardId, users });
      return users;
    } catch (err) {
      this.logger.error(
        'Gagal menghitung presence',
        err instanceof Error ? err.stack : err,
      );
      return [];
    }
  }
}
