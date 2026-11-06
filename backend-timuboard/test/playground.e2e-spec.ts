/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import {
  ROOM_CAP,
  cleanName,
  cleanTz,
  pickRoom,
} from '../src/playground/playground.gateway';

type Msg = { event: string; payload: any };

/** E2E nyata Socket.IO namespace /playground (tamu tanpa login): butuh Redis + Postgres. */
describe('Playground (e2e)', () => {
  let app: INestApplication;
  let url: string;
  const open: Socket[] = [];

  /** `ip` dipalsukan lewat X-Forwarded-For agar batas per IP bisa diuji tanpa saling mengganggu. */
  const connect = async (name: string, ip = `10.0.0.${open.length + 1}`) => {
    const socket = io(`${url}/playground`, {
      auth: { name },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      extraHeaders: { 'x-forwarded-for': ip },
    });
    open.push(socket);
    const log: Msg[] = [];
    socket.onAny((event, payload) => log.push({ event, payload }));
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', (e) => reject(e));
    });
    return { socket, log };
  };
  const waitFor = async (log: Msg[], event: string, ms = 3000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const hit = log.find((m) => m.event === event);
      if (hit) return hit.payload;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error(`event ${event} tidak datang`);
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.listen(0);
    url = await app.getUrl();
  });

  afterAll(async () => {
    open.forEach((s) => s.disconnect());
    await app.close();
  });

  it('pickRoom dan cleanName', () => {
    expect(pickRoom(new Map())).toBe(1);
    expect(pickRoom(new Map([[1, ROOM_CAP]]))).toBe(2);
    expect(
      pickRoom(
        new Map([
          [1, ROOM_CAP],
          [2, 3],
        ]),
      ),
    ).toBe(2);
    expect(cleanName('  Bayu\u0000\n  F  ')).toBe('Bayu F');
    expect(cleanName('   ')).toBeNull();
    expect(cleanName(42)).toBeNull();
    expect(cleanName('x'.repeat(100))).toHaveLength(24);
    expect(cleanTz('Asia/Jakarta')).toBe('Asia/Jakarta');
    expect(cleanTz('America/Argentina/Buenos_Aires')).toBe(
      'America/Argentina/Buenos_Aires',
    );
    expect(cleanTz('Asia/Atlantis')).toBeNull();
    expect(cleanTz('<b>hai</b>')).toBeNull();
    expect(cleanTz(7)).toBeNull();
  });

  it('tamu melihat satu sama lain, papan demo tersinkron, nama disaring', async () => {
    const a = await connect('Ani');
    const welcomeA = await waitFor(a.log, 'welcome');
    expect(welcomeA.self.name).toBe('Ani');
    // Ruang bisa sudah terisi tamu dari instance lain (Redis bersama), jadi isi papan tidak diasumsikan.
    expect(Object.keys(welcomeA.board)).toHaveLength(6);

    const b = await connect('  Budi\u0007 ');
    const welcomeB = await waitFor(b.log, 'welcome');
    expect(welcomeB.self.name).toBe('Budi');
    expect(welcomeB.room).toBe(welcomeA.room);
    expect(welcomeB.members.map((m: any) => m.name)).toEqual(
      expect.arrayContaining(['Ani', 'Budi']),
    );
    expect((await waitFor(a.log, 'presence:join')).name).toBe('Budi');

    expect(
      await a.socket.emitWithAck('task:move', { taskId: 't1', status: 'done' }),
    ).toEqual({ ok: true });
    expect(await waitFor(b.log, 'task:moved')).toMatchObject({
      taskId: 't1',
      status: 'done',
      by: 'Ani',
    });
    expect(
      await a.socket.emitWithAck('task:move', { taskId: 'x', status: 'done' }),
    ).toEqual({ ok: false });

    // Lokasi opt-in: default null, dibagikan lewat `location`, lalu ditarik lagi dengan null.
    expect(welcomeB.self.tz).toBeNull();
    expect(
      await b.socket.emitWithAck('location', { tz: 'Asia/Makassar' }),
    ).toEqual({ ok: true, tz: 'Asia/Makassar' });
    expect(await waitFor(a.log, 'presence:update')).toMatchObject({
      name: 'Budi',
      tz: 'Asia/Makassar',
    });
    expect(
      await b.socket.emitWithAck('location', { tz: 'bukan zona' }),
    ).toEqual({ ok: false });
    expect(await b.socket.emitWithAck('location', { tz: null })).toEqual({
      ok: true,
      tz: null,
    });

    const c = await connect('Cici');
    expect((await waitFor(c.log, 'welcome')).board.t1).toBe('done');

    b.socket.disconnect();
    expect((await waitFor(a.log, 'presence:leave')).id).toBe(welcomeB.self.id);
  });

  it(`menolak koneksi ke-6 dari IP yang sama`, async () => {
    for (let i = 0; i < 5; i++) await connect(`Spam ${i}`, '10.9.9.9');
    await expect(connect('Spam 6', '10.9.9.9')).rejects.toThrow(
      'TOO_MANY_CONNECTIONS',
    );
  });
});
