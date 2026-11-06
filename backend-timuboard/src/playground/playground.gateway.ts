import {
  BeforeApplicationShutdown,
  Inject,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import type { Namespace, Socket } from 'socket.io';
import { REDIS } from '../redis/redis.module';

/**
 * Playground publik untuk tamu tanpa login.
 *
 * Desain beban: pengunjung dibagi ke "ruang" berisi maksimal ROOM_CAP orang. Presence, kursor, reaksi, dan
 * papan demo hanya disiarkan di dalam ruang (biaya tetap per ruang, bukan O(n²) global). Yang global hanya
 * jumlah online: tiap instance mencatat hitungan per ruang di Redis (`pg:rooms:{instance}`, ber-TTL agar
 * instance yang mati hilang sendiri), lalu tiap TICK_MS menyiarkan total ke socket lokalnya saja.
 */
export const ROOM_CAP = 50;
const MAX_CONN_PER_IP = 5;
const TICK_MS = 2000;
const KEY_TTL_S = 15;
const BOARD_TTL_S = 3600;
const NAME_MAX = 24;
const CURSOR_X = [-0.5, 1.5] as const;
const CURSOR_Y = [-2000, 20_000] as const;

export const DEMO_STATUSES = ['doing', 'review', 'done'] as const;
type DemoStatus = (typeof DEMO_STATUSES)[number];
/** Status awal kartu papan demo; judul kartu ada di frontend. */
export const DEMO_TASKS: Record<string, DemoStatus> = {
  t1: 'doing',
  t2: 'doing',
  t3: 'review',
  t4: 'review',
  t5: 'done',
  t6: 'done',
};
const REACTIONS = ['like', 'love', 'fire', 'party'] as const;

/** Batas laju per jenis pesan: [token per detik, lonjakan]. Kelebihan dibuang diam-diam. */
const LIMITS = {
  cursor: [20, 10],
  react: [3, 5],
  move: [4, 6],
  rename: [1, 3],
  location: [1, 3],
} as const;
type LimitKind = keyof typeof LIMITS;

export interface Guest {
  id: string;
  name: string;
  /** Zona waktu IANA dari browser, hanya bila tamu memilih membagikannya (opt-in). */
  tz: string | null;
}
interface GuestData {
  user: Guest;
  room: number;
  ip: string;
}
const dataOf = (s: { data: unknown }) => s.data as GuestData;
const roomName = (n: number) => `room:${n}`;
const boardKey = (n: number) => `pg:board:${n}`;

/** Buang karakter kontrol, rapikan spasi, potong panjang. Kosong = null. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw
    .replace(/\p{C}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
  return name || null;
}

/**
 * Zona waktu dari klien (bisa dipalsukan, jadi hanya perkiraan): wajib berbentuk nama IANA dan dikenali Intl.
 * Selain itu = null, sehingga teks bebas tidak bisa disisipkan lewat field ini.
 */
export function cleanTz(raw: unknown): string | null {
  if (
    typeof raw !== 'string' ||
    !/^[A-Za-z]+(\/[A-Za-z0-9_+-]+){1,2}$/.test(raw) ||
    raw.length > 40
  )
    return null;
  try {
    new Intl.DateTimeFormat('en', { timeZone: raw });
    return raw;
  } catch {
    return null;
  }
}

/** Ruang bernomor terkecil yang belum penuh. */
export function pickRoom(counts: Map<number, number>): number {
  let room = 1;
  while ((counts.get(room) ?? 0) >= ROOM_CAP) room++;
  return room;
}

@WebSocketGateway({ namespace: '/playground' })
export class PlaygroundGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy,
    BeforeApplicationShutdown
{
  @WebSocketServer() private ns!: Namespace;
  private readonly logger = new Logger(PlaygroundGateway.name);
  private readonly instanceKey = `pg:rooms:${randomUUID()}`;
  /** Hitungan per ruang di semua instance, diperbarui tiap tick + perubahan lokal. */
  // ponytail: cache bisa basi ≤ TICK_MS, jadi saat lonjakan ruang bisa sedikit melewati ROOM_CAP (batas lunak).
  private counts = new Map<number, number>();
  private total = 0;
  private readonly perIp = new Map<string, number>();
  private readonly buckets = new WeakMap<
    Socket,
    Partial<Record<LimitKind, { tokens: number; at: number }>>
  >();
  private timer?: NodeJS.Timeout;
  private closing = false;

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  afterInit(ns: Namespace) {
    // ponytail: batas per IP disimpan per instance; pindah ke Redis bila instance banyak dan spam jadi masalah.
    ns.use((socket, next) => {
      const ip = clientIp(socket);
      const n = this.perIp.get(ip) ?? 0;
      if (n >= MAX_CONN_PER_IP) return next(new Error('TOO_MANY_CONNECTIONS'));
      this.perIp.set(ip, n + 1);
      dataOf(socket).ip = ip;
      next();
    });
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    void this.tick();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async beforeApplicationShutdown() {
    this.closing = true;
    clearInterval(this.timer);
    await this.redis.del(this.instanceKey).catch(() => undefined);
  }

  async handleConnection(socket: Socket) {
    const auth = socket.handshake.auth as
      | { name?: unknown; tz?: unknown }
      | undefined;
    const user: Guest = {
      id: socket.id,
      name:
        cleanName(auth?.name) ??
        `Tamu ${Math.floor(100 + Math.random() * 900)}`,
      tz: cleanTz(auth?.tz),
    };
    const room = pickRoom(this.counts);
    Object.assign(dataOf(socket), { user, room });
    this.bump(room, 1);

    try {
      if ((this.counts.get(room) ?? 0) === 1)
        await this.redis.del(boardKey(room)); // ruang kosong: mulai dari papan bersih
      await this.redis
        .multi()
        .hincrby(this.instanceKey, String(room), 1)
        .expire(this.instanceKey, KEY_TTL_S)
        .exec();
      await socket.join(roomName(room));
      // Snapshot hanya sebesar satu ruang (≤ ROOM_CAP), bukan seluruh pengunjung.
      const peers = await this.ns.in(roomName(room)).fetchSockets();
      const members = peers.map((s) => dataOf(s).user);
      socket.emit('welcome', {
        self: user,
        room,
        members,
        board: await this.board(room),
        total: this.total,
      });
      socket.to(roomName(room)).emit('presence:join', user);
    } catch (err) {
      this.logger.error(
        'Gagal bergabung ke playground',
        err instanceof Error ? err.stack : err,
      );
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    const { ip, room, user } = dataOf(socket);
    if (ip) {
      const n = (this.perIp.get(ip) ?? 1) - 1;
      if (n > 0) this.perIp.set(ip, n);
      else this.perIp.delete(ip);
    }
    if (!room || this.closing) return;
    this.bump(room, -1);
    socket.to(roomName(room)).emit('presence:leave', user);
    void this.redis
      .hincrby(this.instanceKey, String(room), -1)
      .catch(() => undefined);
  }

  @SubscribeMessage('rename')
  rename(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    const name = cleanName((body as { name?: unknown } | null)?.name);
    if (!name || !this.allow(socket, 'rename')) return { ok: false };
    const d = dataOf(socket);
    d.user = { ...d.user, name };
    socket.to(roomName(d.room)).emit('presence:update', d.user);
    return { ok: true, name };
  }

  /** Bagikan (`tz` valid) atau berhenti membagikan (`tz: null`) perkiraan lokasi. */
  @SubscribeMessage('location')
  location(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    const raw = (body as { tz?: unknown } | null)?.tz;
    const tz = raw === null ? null : cleanTz(raw);
    if ((raw !== null && !tz) || !this.allow(socket, 'location'))
      return { ok: false };
    const d = dataOf(socket);
    d.user = { ...d.user, tz };
    socket.to(roomName(d.room)).emit('presence:update', d.user);
    return { ok: true, tz };
  }

  @SubscribeMessage('cursor:move')
  cursorMove(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    const { x, y } = (body ?? {}) as { x?: unknown; y?: unknown };
    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      !(x >= CURSOR_X[0] && x <= CURSOR_X[1]) ||
      !(y >= CURSOR_Y[0] && y <= CURSOR_Y[1]) ||
      !this.allow(socket, 'cursor')
    )
      return;
    const { room, user } = dataOf(socket);
    socket
      .to(roomName(room))
      .volatile.emit('cursor:move', { id: user.id, name: user.name, x, y });
  }

  @SubscribeMessage('cursor:hide')
  cursorHide(@ConnectedSocket() socket: Socket) {
    const { room, user } = dataOf(socket);
    socket.to(roomName(room)).emit('cursor:hide', { id: user.id });
  }

  @SubscribeMessage('react')
  react(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    const kind = (body as { kind?: unknown } | null)?.kind;
    if (
      !REACTIONS.includes(kind as (typeof REACTIONS)[number]) ||
      !this.allow(socket, 'react')
    )
      return;
    const { room, user } = dataOf(socket);
    socket
      .to(roomName(room))
      .volatile.emit('react', { id: user.id, name: user.name, kind });
  }

  @SubscribeMessage('task:move')
  async moveTask(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ) {
    const { taskId, status } = (body ?? {}) as {
      taskId?: unknown;
      status?: unknown;
    };
    if (
      typeof taskId !== 'string' ||
      !Object.hasOwn(DEMO_TASKS, taskId) ||
      !DEMO_STATUSES.includes(status as DemoStatus) ||
      !this.allow(socket, 'move')
    )
      return { ok: false };
    const { room, user } = dataOf(socket);
    await this.redis
      .multi()
      .hset(boardKey(room), taskId, status as string)
      .expire(boardKey(room), BOARD_TTL_S)
      .exec();
    socket
      .to(roomName(room))
      .emit('task:moved', { taskId, status, by: user.name });
    return { ok: true };
  }

  private async board(room: number): Promise<Record<string, DemoStatus>> {
    const saved = await this.redis.hgetall(boardKey(room));
    const board = { ...DEMO_TASKS };
    for (const [id, s] of Object.entries(saved))
      if (Object.hasOwn(board, id) && DEMO_STATUSES.includes(s as DemoStatus))
        board[id] = s as DemoStatus;
    return board;
  }

  private bump(room: number, delta: number) {
    this.counts.set(room, Math.max(0, (this.counts.get(room) ?? 0) + delta));
  }

  /** Perpanjang TTL kunci instance, hitung ulang semua ruang dari Redis, siarkan total bila berubah. */
  private async tick() {
    if (this.closing) return;
    try {
      await this.redis.expire(this.instanceKey, KEY_TTL_S);
      const keys: string[] = [];
      let cursor = '0';
      do {
        const [next, batch] = await this.redis.scan(
          cursor,
          'MATCH',
          'pg:rooms:*',
          'COUNT',
          100,
        );
        cursor = next;
        keys.push(...batch);
      } while (cursor !== '0');
      const pipe = this.redis.pipeline();
      keys.forEach((k) => pipe.hgetall(k));
      const results = (await pipe.exec()) ?? [];
      const counts = new Map<number, number>();
      for (const [, hash] of results)
        for (const [room, n] of Object.entries(
          (hash ?? {}) as Record<string, string>,
        ))
          counts.set(Number(room), (counts.get(Number(room)) ?? 0) + Number(n));
      this.counts = counts;
      const total = [...counts.values()].reduce(
        (a, b) => a + Math.max(0, b),
        0,
      );
      if (total !== this.total) {
        this.total = total;
        // Hanya ke socket di instance ini: instance lain menyiarkan ke socket mereka sendiri.
        this.ns.local.emit('online', { total });
      }
    } catch (err) {
      this.logger.warn(
        `Tick playground gagal: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /** Token bucket per socket per jenis pesan. */
  private allow(socket: Socket, kind: LimitKind): boolean {
    const [rate, burst] = LIMITS[kind];
    const now = Date.now();
    const all = this.buckets.get(socket) ?? {};
    const b = all[kind] ?? { tokens: burst, at: now };
    b.tokens = Math.min(burst, b.tokens + ((now - b.at) / 1000) * rate);
    b.at = now;
    const ok = b.tokens >= 1;
    if (ok) b.tokens -= 1;
    all[kind] = b;
    this.buckets.set(socket, all);
    return ok;
  }
}

/** Di belakang Caddy, IP klien asli adalah entri terakhir X-Forwarded-For (sama dengan `trust proxy 1`). */
function clientIp(socket: Socket): string {
  const xff = socket.handshake.headers['x-forwarded-for'];
  const last =
    typeof xff === 'string' ? xff.split(',').pop()?.trim() : undefined;
  return last || socket.handshake.address;
}
