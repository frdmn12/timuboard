// Suite ini tidak menguji rate limit; matikan agar tidak berbagi batas 10/menit dengan suite auth.
process.env.THROTTLE_DISABLED = 'true';
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { signup, type TestUser } from './helpers';

type Msg = { event: string; payload: any };

/** E2E nyata Socket.IO: butuh Postgres, Redis, dan Mailpit (docker compose). */
describe('Papan realtime (e2e)', () => {
  let app: INestApplication;
  let url: string;
  let alice: TestUser; // admin
  let bob: TestUser; // anggota
  let carol: TestUser; // orang luar (papan sendiri)
  let boardId: string;
  let carolBoardId: string;
  let boardId2: string;
  let boardId3: string;
  const open: Socket[] = [];
  const http = () => request(app.getHttpServer());
  const token = (u: TestUser) => u.auth.Authorization.replace('Bearer ', '');

  /** Sambung dan rekam semua event; `await ready` memastikan sudah terhubung. */
  const connect = async (
    u: TestUser,
    auth: Record<string, unknown> = { token: token(u) },
  ) => {
    const socket = io(url, {
      auth,
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
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
  const join = (socket: Socket, id: string) =>
    socket.timeout(3000).emitWithAck('board:join', { boardId: id });
  const waitFor = async (
    log: Msg[],
    event: string,
    pred: (p: any) => boolean = () => true,
    ms = 3000,
  ): Promise<any> => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const hit = log.find((m) => m.event === event && pred(m.payload));
      if (hit) return hit.payload;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(
      `event "${event}" tidak diterima dalam ${ms}ms. Diterima: ${log.map((m) => m.event).join(', ')}`,
    );
  };
  const quiet = (ms = 400) => new Promise((r) => setTimeout(r, ms));
  const count = (log: Msg[], event: string) =>
    log.filter((m) => m.event === event).length;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.listen(0);
    url = await app.getUrl().then((u) => u.replace('[::1]', 'localhost'));
    [alice, bob, carol] = [
      await signup(app, 'alice'),
      await signup(app, 'bob'),
      await signup(app, 'carol'),
    ];
    boardId = (
      await http()
        .post('/boards')
        .set(alice.auth)
        .send({ name: 'Realtime' })
        .expect(201)
    ).body.data.id;
    await http()
      .post(`/boards/${boardId}/members`)
      .set(alice.auth)
      .send({ email: bob.email })
      .expect(201);
    boardId2 = (
      await http()
        .post('/boards')
        .set(alice.auth)
        .send({ name: 'Dua instance' })
        .expect(201)
    ).body.data.id;
    await http()
      .post(`/boards/${boardId2}/members`)
      .set(alice.auth)
      .send({ email: bob.email })
      .expect(201);
    carolBoardId = (
      await http()
        .post('/boards')
        .set(carol.auth)
        .send({ name: 'Punya Carol' })
        .expect(201)
    ).body.data.id;
  }, 60_000);
  afterAll(async () => {
    open.forEach((s) => s.close());
    await app.close();
  });

  describe('koneksi dan akses', () => {
    it('menolak tanpa token, token ngawur, dan token kedaluwarsa (UNAUTHORIZED)', async () => {
      await expect(connect(alice, {})).rejects.toMatchObject({
        message: 'UNAUTHORIZED',
      });
      await expect(
        connect(alice, { token: 'bukan.jwt.valid' }),
      ).rejects.toMatchObject({ message: 'UNAUTHORIZED' });
      const expired = await app
        .get(JwtService)
        .signAsync(
          { sub: alice.id, email: alice.email },
          { expiresIn: '-10s' },
        );
      await expect(connect(alice, { token: expired })).rejects.toMatchObject({
        message: 'UNAUTHORIZED',
      });
    });

    it('join papan: anggota berhasil dengan presence; orang luar dan id ngawur ditolak seragam', async () => {
      const a = await connect(alice);
      const ok = await join(a.socket, boardId);
      expect(ok).toMatchObject({ ok: true });
      expect(ok.presence.map((u: any) => u.id)).toEqual([alice.id]);
      const c = await connect(carol);
      expect(await join(c.socket, boardId)).toEqual({
        ok: false,
        code: 'BOARD_NOT_FOUND',
      });
      expect(await join(c.socket, 'bukan-uuid')).toEqual({
        ok: false,
        code: 'BOARD_NOT_FOUND',
      });
      expect(
        await join(c.socket, '00000000-0000-4000-8000-000000000000'),
      ).toEqual({ ok: false, code: 'BOARD_NOT_FOUND' });
    });

    it('token kedaluwarsa saat tersambung: server memutus dengan auth:expired', async () => {
      const short = await app
        .get(JwtService)
        .signAsync({ sub: alice.id, email: alice.email }, { expiresIn: '1s' });
      const { socket, log } = await connect(alice, { token: short });
      await waitFor(log, 'auth:expired', () => true, 4000);
      await new Promise((r) => setTimeout(r, 200));
      expect(socket.connected).toBe(false);
    });
  });

  describe('presence', () => {
    it('menampilkan pengguna unik yang sedang membuka papan; berubah saat gabung/keluar/putus', async () => {
      const a = await connect(alice);
      await join(a.socket, boardId);
      const a2 = await connect(alice); // tab kedua Alice: tetap satu orang
      await join(a2.socket, boardId);
      const b = await connect(bob);
      const res = await join(b.socket, boardId);
      expect(res.presence.map((u: any) => u.id).sort()).toEqual(
        [alice.id, bob.id].sort(),
      );
      const seen = await waitFor(
        a.log,
        'presence:update',
        (p) => p.users.length === 2,
      );
      expect(seen.boardId).toBe(boardId);
      await b.socket.timeout(3000).emitWithAck('board:leave', { boardId });
      await waitFor(
        a.log,
        'presence:update',
        (p) => p.users.length === 1 && p.users[0].id === alice.id,
      );
      await join(b.socket, boardId);
      b.socket.close(); // putus mendadak
      await waitFor(
        a2.log,
        'presence:update',
        (p) => p.users.length === 1 && p.users[0].id === alice.id,
      );
      a.socket.close();
      a2.socket.close();
    });
  });

  describe('siaran perubahan', () => {
    let a: Awaited<ReturnType<typeof connect>>;
    let a2: Awaited<ReturnType<typeof connect>>;
    let b: Awaited<ReturnType<typeof connect>>;
    let c: Awaited<ReturnType<typeof connect>>;
    let taskId: string;

    beforeAll(async () => {
      a = await connect(alice);
      a2 = await connect(alice);
      b = await connect(bob);
      c = await connect(carol);
      await join(a.socket, boardId);
      await join(a2.socket, boardId);
      await join(b.socket, boardId);
      await join(c.socket, carolBoardId);
    });

    it('task:created sampai ke anggota lain dan tab lain pelaku, tetapi tidak memantul ke socket pelaku', async () => {
      const res = await http()
        .post(`/boards/${boardId}/tasks`)
        .set(alice.auth)
        .set('X-Socket-Id', a.socket.id!)
        .send({ title: 'Siaran pertama', tags: ['web'] })
        .expect(201);
      taskId = res.body.data.id;
      const onBob = await waitFor(b.log, 'task:created');
      expect(onBob).toMatchObject({
        boardId,
        actorId: alice.id,
        task: {
          id: taskId,
          title: 'Siaran pertama',
          status: 'todo',
          tags: ['web'],
          commentCount: 0,
        },
      });
      expect(onBob.task).not.toHaveProperty('pinned'); // pinned bersifat pribadi
      await waitFor(a2.log, 'task:created'); // tab lain Alice menerima
      await quiet();
      expect(count(a.log, 'task:created')).toBe(0); // socket pelaku dikecualikan
      expect(count(c.log, 'task:created')).toBe(0); // orang luar tidak pernah menerima
    });

    it('task:updated, task:moved (dengan urutan kolom), dan task:deleted', async () => {
      await http()
        .patch(`/boards/${boardId}/tasks/${taskId}`)
        .set(bob.auth)
        .send({ title: 'Judul baru', progress: 40 })
        .expect(200);
      expect((await waitFor(a.log, 'task:updated')).task).toMatchObject({
        id: taskId,
        title: 'Judul baru',
        progress: 40,
      });

      const second = (
        await http()
          .post(`/boards/${boardId}/tasks`)
          .set(alice.auth)
          .send({ title: 'Kedua' })
          .expect(201)
      ).body.data.id;
      await http()
        .post(`/boards/${boardId}/tasks/${taskId}/move`)
        .set(alice.auth)
        .send({ status: 'doing', position: 0 })
        .expect(200);
      const moved = await waitFor(b.log, 'task:moved');
      expect(moved.task).toMatchObject({
        id: taskId,
        status: 'doing',
        order: 0,
      });
      expect(moved.columns).toEqual({ doing: [taskId], todo: [second] }); // kolom asal dan tujuan sudah dinomori ulang

      await http()
        .delete(`/boards/${boardId}/tasks/${second}`)
        .set(alice.auth)
        .expect(204);
      expect(
        await waitFor(b.log, 'task:deleted', (p) => p.taskId === second),
      ).toMatchObject({ boardId, actorId: alice.id });
    });

    it('comment:created/updated/deleted membawa jumlah komentar dan tanpa hak pribadi', async () => {
      const url = `/boards/${boardId}/tasks/${taskId}/comments`;
      const created = (
        await http()
          .post(url)
          .set(bob.auth)
          .send({ body: 'Halo tim' })
          .expect(201)
      ).body.data;
      const ev = await waitFor(a.log, 'comment:created');
      expect(ev).toMatchObject({
        taskId,
        commentCount: 1,
        comment: { id: created.id, body: 'Halo tim', author: { id: bob.id } },
      });
      expect(ev.comment).not.toHaveProperty('canEdit');
      await http()
        .patch(`${url}/${created.id}`)
        .set(bob.auth)
        .send({ body: 'Halo semua' })
        .expect(200);
      expect((await waitFor(a.log, 'comment:updated')).comment).toMatchObject({
        body: 'Halo semua',
        edited: true,
      });
      await http().delete(`${url}/${created.id}`).set(alice.auth).expect(204);
      expect(await waitFor(a.log, 'comment:deleted')).toMatchObject({
        commentId: created.id,
        commentCount: 0,
      });
    });

    it('board:updated dan member:updated/added', async () => {
      await http()
        .patch(`/boards/${boardId}`)
        .set(alice.auth)
        .send({ name: 'Realtime v2' })
        .expect(200);
      expect((await waitFor(b.log, 'board:updated')).board).toMatchObject({
        id: boardId,
        name: 'Realtime v2',
      });
      await http()
        .patch(`/boards/${boardId}/members/${bob.id}`)
        .set(alice.auth)
        .send({ role: 'admin' })
        .expect(200);
      expect((await waitFor(a.log, 'member:updated')).member).toMatchObject({
        userId: bob.id,
        role: 'admin',
      });
      await http()
        .patch(`/boards/${boardId}/members/${bob.id}`)
        .set(alice.auth)
        .send({ role: 'member' })
        .expect(200);
    });

    it('notification:new masuk ke room pribadi, walau belum membuka papan apa pun', async () => {
      const idle = await connect(bob); // tidak join papan
      await http()
        .post(`/boards/${boardId}/tasks`)
        .set(alice.auth)
        .send({ title: 'Untuk Bob', assigneeId: bob.id })
        .expect(201);
      expect(await waitFor(idle.log, 'notification:new')).toMatchObject({
        type: 'task_assigned',
      });
      expect(count(a.log, 'notification:new')).toBe(0); // Alice pelaku, tidak dikabari
    });

    it('anggota dikeluarkan: dapat member:removed lalu tidak menerima siaran berikutnya; admin lain tetap menerima', async () => {
      await http()
        .delete(`/boards/${boardId}/members/${bob.id}`)
        .set(alice.auth)
        .expect(204);
      expect(await waitFor(b.log, 'member:removed')).toMatchObject({
        userId: bob.id,
        actorId: alice.id,
      });
      await waitFor(a2.log, 'member:removed');
      await quiet(300);
      const before = b.log.length;
      await http()
        .post(`/boards/${boardId}/tasks`)
        .set(alice.auth)
        .send({ title: 'Setelah Bob dikeluarkan' })
        .expect(201);
      await waitFor(
        a2.log,
        'task:created',
        (p) => p.task.title === 'Setelah Bob dikeluarkan',
      );
      await quiet();
      expect(
        b.log.slice(before).filter((m) => m.event === 'task:created'),
      ).toHaveLength(0);
      expect(await join(b.socket, boardId)).toEqual({
        ok: false,
        code: 'BOARD_NOT_FOUND',
      }); // tidak bisa join lagi
    });

    it('papan dihapus: semua yang membuka papan menerima board:deleted', async () => {
      await http()
        .post(`/boards/${boardId}/members`)
        .set(alice.auth)
        .send({ email: bob.email })
        .expect(201);
      await join(b.socket, boardId);
      b.log.length = 0;
      await http().delete(`/boards/${boardId}`).set(alice.auth).expect(204);
      expect(await waitFor(b.log, 'board:deleted')).toMatchObject({
        boardId,
        actorId: alice.id,
      });
      await waitFor(a2.log, 'board:deleted');
    });
  });

  describe('kursor', () => {
    let a: Awaited<ReturnType<typeof connect>>;
    let b: Awaited<ReturnType<typeof connect>>;
    let c: Awaited<ReturnType<typeof connect>>;
    const move = (s: Socket, id: string, x: unknown, y: unknown) =>
      s.emit('cursor:move', { boardId: id, x, y });

    beforeAll(async () => {
      boardId3 = (
        await http()
          .post('/boards')
          .set(alice.auth)
          .send({ name: 'Kursor' })
          .expect(201)
      ).body.data.id;
      await http()
        .post(`/boards/${boardId3}/members`)
        .set(alice.auth)
        .send({ email: bob.email })
        .expect(201);
      a = await connect(alice);
      b = await connect(bob);
      c = await connect(carol); // orang luar
      await join(a.socket, boardId3);
      await join(b.socket, boardId3);
    });

    it('posisi kursor sampai ke anggota lain (dengan nama dan id), tidak ke pengirim', async () => {
      move(a.socket, boardId3, 0.25, 120);
      const got = await waitFor(
        b.log,
        'cursor:move',
        (p) => p.userId === alice.id,
      );
      expect(got).toEqual({
        boardId: boardId3,
        socketId: a.socket.id,
        userId: alice.id,
        name: 'User alice',
        x: 0.25,
        y: 120,
      });
      await quiet();
      expect(count(a.log, 'cursor:move')).toBe(0);
    });

    it('mengabaikan payload tidak valid, di luar rentang, dan dari socket yang belum join/bukan anggota', async () => {
      const before = count(b.log, 'cursor:move');
      move(a.socket, boardId3, 'kiri', 10);
      move(a.socket, boardId3, NaN, 10);
      move(a.socket, boardId3, 0.5, Infinity);
      move(a.socket, boardId3, 9, 10); // x di luar rentang
      move(a.socket, boardId3, 0.5, -99999); // y di luar rentang
      move(a.socket, 'bukan-uuid', 0.5, 10);
      a.socket.emit('cursor:move', null);
      move(c.socket, boardId3, 0.5, 10); // Carol bukan anggota dan belum join
      await join(c.socket, carolBoardId);
      move(c.socket, boardId3, 0.5, 10); // sudah join papan lain, bukan papan ini
      await quiet(500);
      expect(count(b.log, 'cursor:move')).toBe(before);
    });

    it('dibatasi lajunya: banjir 300 pesan hanya sebagian kecil yang diteruskan', async () => {
      const before = count(b.log, 'cursor:move');
      for (let i = 0; i < 300; i++) move(a.socket, boardId3, 0.5, i);
      await quiet(700);
      const received = count(b.log, 'cursor:move') - before;
      expect(received).toBeGreaterThan(0);
      expect(received).toBeLessThan(60); // burst 10 + sekitar 30/detik selama tes
    });

    it('cursor:hide diteruskan; juga otomatis saat meninggalkan papan dan saat terputus', async () => {
      a.socket.emit('cursor:hide', { boardId: boardId3 });
      expect(
        await waitFor(b.log, 'cursor:hide', (p) => p.socketId === a.socket.id),
      ).toMatchObject({ boardId: boardId3 });

      const a2 = await connect(alice);
      await join(a2.socket, boardId3);
      await a2.socket
        .timeout(3000)
        .emitWithAck('board:leave', { boardId: boardId3 });
      await waitFor(b.log, 'cursor:hide', (p) => p.socketId === a2.socket.id);

      const a3 = await connect(alice);
      await join(a3.socket, boardId3);
      const id3 = a3.socket.id;
      a3.socket.close(); // putus mendadak
      await waitFor(b.log, 'cursor:hide', (p) => p.socketId === id3);
    });
  });

  describe('banyak instance (Redis)', () => {
    it('perubahan lewat instance B sampai ke klien yang tersambung ke instance A, dan presence lintas instance', async () => {
      const modB = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      const appB = modB.createNestApplication();
      configureApp(appB);
      await appB.listen(0);
      const urlB = (await appB.getUrl()).replace('[::1]', 'localhost');
      try {
        const onA = await connect(alice); // tersambung ke instance A (app utama)
        await join(onA.socket, boardId2);
        const sockB = io(urlB, {
          auth: { token: token(bob) },
          transports: ['websocket'],
          forceNew: true,
          reconnection: false,
        });
        open.push(sockB);
        const logB: Msg[] = [];
        sockB.onAny((event, payload) => logB.push({ event, payload }));
        await new Promise<void>((resolve, reject) => {
          sockB.once('connect', () => resolve());
          sockB.once('connect_error', reject);
        });
        const res = await join(sockB, boardId2);
        expect(res.presence.map((u: any) => u.id).sort()).toEqual(
          [alice.id, bob.id].sort(),
        ); // lihat Alice di instance lain
        await waitFor(onA.log, 'presence:update', (p) => p.users.length === 2);
        // REST ke instance B → klien di instance A menerima
        await request(appB.getHttpServer())
          .post(`/boards/${boardId2}/tasks`)
          .set(bob.auth)
          .send({ title: 'Dari instance B' })
          .expect(201);
        expect((await waitFor(onA.log, 'task:created')).task.title).toBe(
          'Dari instance B',
        );
      } finally {
        await appB.close();
      }
    });
  });
});
