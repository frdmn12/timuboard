/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
// Suite ini tidak menguji rate limit; matikan agar tidak berbagi batas 10/menit dengan suite auth.
process.env.THROTTLE_DISABLED = 'true';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { signup, type TestUser } from './helpers';

/** E2E nyata untuk Board dan Task: butuh Postgres, Redis, dan Mailpit (docker compose). */
describe('Boards & Tasks (e2e)', () => {
  let app: INestApplication;
  let alice: TestUser; // pemilik/admin
  let bob: TestUser; // anggota
  let carol: TestUser; // bukan anggota
  let boardId: string;
  const ids: Record<string, string> = {};
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    [alice, bob, carol] = [
      await signup(app, 'alice'),
      await signup(app, 'bob'),
      await signup(app, 'carol'),
    ];
  }, 60_000);
  afterAll(() => app.close());

  const list = async (user: TestUser, qs = '') =>
    (
      await http()
        .get(`/boards/${boardId}/tasks${qs}`)
        .set(user.auth)
        .expect(200)
    ).body.data as {
      id: string;
      title: string;
      status: string;
      order: number;
      progress: number;
      pinned: boolean;
    }[];
  const columns = async (user: TestUser) => {
    const out: Record<string, string[]> = {
      todo: [],
      doing: [],
      review: [],
      done: [],
    };
    for (const t of await list(user)) out[t.status][t.order] = t.title;
    return out;
  };

  describe('papan', () => {
    it('menolak tanpa token (401)', () => http().get('/boards').expect(401));

    it('membuat papan: pembuat otomatis admin dan pemilik', async () => {
      const res = await http()
        .post('/boards')
        .set(alice.auth)
        .send({ name: '  Peluncuran v2  ', description: 'Rilis publik' })
        .expect(201);
      boardId = res.body.data.id;
      expect(res.body.data).toMatchObject({
        name: 'Peluncuran v2',
        role: 'admin',
        memberCount: 1,
        taskCount: 0,
        progress: 0,
        ownerId: alice.id,
      });
      const mine = await http().get('/boards').set(alice.auth).expect(200);
      expect(mine.body.data.map((b: { id: string }) => b.id)).toContain(
        boardId,
      );
    });

    it('validasi: nama kosong dan properti asing ditolak (400)', () =>
      http()
        .post('/boards')
        .set(alice.auth)
        .send({ name: '', owner: 'x' })
        .expect(400));

    it('bukan anggota = 404 (papan tidak dibocorkan), id bukan UUID = 404', async () => {
      await http().get(`/boards/${boardId}`).set(carol.auth).expect(404);
      await http().get(`/boards/${boardId}/tasks`).set(carol.auth).expect(404);
      await http().get('/boards/bukan-uuid').set(alice.auth).expect(404);
      expect((await http().get('/boards').set(carol.auth)).body.data).toEqual(
        [],
      );
    });
  });

  describe('anggota', () => {
    it('admin menambah anggota lewat email; email tak dikenal 404; ganda 409', async () => {
      await http()
        .post(`/boards/${boardId}/members`)
        .set(alice.auth)
        .send({ email: bob.email })
        .expect(201)
        .expect((r) =>
          expect(r.body.data).toMatchObject({
            userId: bob.id,
            role: 'member',
            isOwner: false,
          }),
        );
      await http()
        .post(`/boards/${boardId}/members`)
        .set(alice.auth)
        .send({ email: 'tidak-ada@timuboard.test' })
        .expect(404);
      await http()
        .post(`/boards/${boardId}/members`)
        .set(alice.auth)
        .send({ email: bob.email })
        .expect(409);
    });

    it('anggota biasa tidak boleh mengubah papan atau mengundang (403), tapi boleh melihat', async () => {
      await http()
        .get(`/boards/${boardId}`)
        .set(bob.auth)
        .expect(200)
        .expect((r) => expect(r.body.data.role).toBe('member'));
      await http()
        .patch(`/boards/${boardId}`)
        .set(bob.auth)
        .send({ name: 'Diretas' })
        .expect(403);
      await http()
        .post(`/boards/${boardId}/members`)
        .set(bob.auth)
        .send({ email: carol.email })
        .expect(403);
      await http()
        .get(`/boards/${boardId}/members`)
        .set(bob.auth)
        .expect(200)
        .expect((r) => expect(r.body.data).toHaveLength(2));
    });

    it('peran pemilik tidak bisa diubah atau dicabut', async () => {
      await http()
        .patch(`/boards/${boardId}/members/${alice.id}`)
        .set(alice.auth)
        .send({ role: 'member' })
        .expect(403);
      await http()
        .delete(`/boards/${boardId}/members/${alice.id}`)
        .set(alice.auth)
        .expect(400);
    });
  });

  describe('tugas', () => {
    it('membuat tugas: urutan bertambah per kolom, progres bawaan mengikuti status', async () => {
      for (const title of ['Brief', 'Riset', 'Wireframe']) {
        const r = await http()
          .post(`/boards/${boardId}/tasks`)
          .set(alice.auth)
          .send({
            title,
            tags: ['  desain ', 'desain', 'web'],
            priority: 'high',
          })
          .expect(201);
        ids[title] = r.body.data.id;
        expect(r.body.data.tags).toEqual(['desain', 'web']);
      }
      expect(await columns(alice)).toMatchObject({
        todo: ['Brief', 'Riset', 'Wireframe'],
      });
      const done = await http()
        .post(`/boards/${boardId}/tasks`)
        .set(bob.auth)
        .send({ title: 'Audit', status: 'done' })
        .expect(201);
      expect(done.body.data).toMatchObject({
        status: 'done',
        progress: 100,
        order: 0,
      });
      ids.Audit = done.body.data.id;
    });

    it('validasi tugas: judul kosong, progres di luar 0-100, status tidak dikenal (400)', async () => {
      await http()
        .post(`/boards/${boardId}/tasks`)
        .set(alice.auth)
        .send({ title: '' })
        .expect(400);
      await http()
        .post(`/boards/${boardId}/tasks`)
        .set(alice.auth)
        .send({ title: 'x', progress: 150 })
        .expect(400);
      await http()
        .post(`/boards/${boardId}/tasks`)
        .set(alice.auth)
        .send({ title: 'x', status: 'selesai' })
        .expect(400);
    });

    it('penanggung jawab harus anggota papan', async () => {
      await http()
        .patch(`/boards/${boardId}/tasks/${ids.Brief}`)
        .set(alice.auth)
        .send({ assigneeId: carol.id })
        .expect(400)
        .expect((r) => expect(r.body.error.code).toBe('ASSIGNEE_NOT_MEMBER'));
      await http()
        .patch(`/boards/${boardId}/tasks/${ids.Brief}`)
        .set(alice.auth)
        .send({
          assigneeId: bob.id,
          progress: 40,
          dueDate: '2026-12-01T00:00:00.000Z',
        })
        .expect(200)
        .expect((r) => {
          expect(r.body.data.assignee).toEqual({
            id: bob.id,
            name: 'User bob',
          });
          expect(r.body.data.progress).toBe(40);
        });
      await http()
        .patch(`/boards/${boardId}/tasks/${ids.Brief}`)
        .set(alice.auth)
        .send({ assigneeId: null, dueDate: null })
        .expect(200)
        .expect((r) =>
          expect(r.body.data).toMatchObject({ assignee: null, dueDate: null }),
        );
    });

    it('PATCH tidak boleh mengubah status (harus lewat move)', () =>
      http()
        .patch(`/boards/${boardId}/tasks/${ids.Brief}`)
        .set(alice.auth)
        .send({ status: 'done' })
        .expect(400));

    it('move dalam kolom yang sama mengurutkan ulang', async () => {
      await http()
        .post(`/boards/${boardId}/tasks/${ids.Wireframe}/move`)
        .set(bob.auth)
        .send({ status: 'todo', position: 0 })
        .expect(200);
      expect(await columns(alice)).toMatchObject({
        todo: ['Wireframe', 'Brief', 'Riset'],
      });
    });

    it('move antar kolom: nomor kolom asal dan tujuan dirapikan, progres naik', async () => {
      const r = await http()
        .post(`/boards/${boardId}/tasks/${ids.Brief}/move`)
        .set(alice.auth)
        .send({ status: 'done', position: 0 })
        .expect(200);
      expect(r.body.data).toMatchObject({
        status: 'done',
        order: 0,
        progress: 100,
      });
      expect(await columns(alice)).toMatchObject({
        todo: ['Wireframe', 'Riset'],
        done: ['Brief', 'Audit'],
      });
      // keluar dari done: progres 100 diturunkan ke bawaan status tujuan
      const back = await http()
        .post(`/boards/${boardId}/tasks/${ids.Brief}/move`)
        .set(alice.auth)
        .send({ status: 'doing', position: 99 })
        .expect(200);
      expect(back.body.data).toMatchObject({
        status: 'doing',
        order: 0,
        progress: 25,
      });
      expect(await columns(alice)).toMatchObject({
        todo: ['Wireframe', 'Riset'],
        doing: ['Brief'],
        done: ['Audit'],
      });
    });

    it('filter: status, pencarian teks (termasuk tag), dan pencarian aman dari wildcard', async () => {
      expect(
        (await list(alice, '?status=todo')).map((t) => t.title).sort(),
      ).toEqual(['Riset', 'Wireframe']);
      expect((await list(alice, '?q=wire')).map((t) => t.title)).toEqual([
        'Wireframe',
      ]);
      expect((await list(alice, '?q=web')).length).toBe(3); // tag "web"
      expect(await list(alice, '?q=%25')).toEqual([]); // "%" dicari harfiah, bukan wildcard
    });
  });

  describe('sematan (pribadi)', () => {
    it('menyematkan, melihat daftar lintas papan, melepas; pengguna lain tidak ikut', async () => {
      await http()
        .put(`/boards/${boardId}/tasks/${ids.Riset}/pin`)
        .set(alice.auth)
        .expect(200)
        .expect((r) => expect(r.body.data.pinned).toBe(true));
      await http()
        .put(`/boards/${boardId}/tasks/${ids.Riset}/pin`)
        .set(alice.auth)
        .expect(200); // idempoten
      expect(
        (
          await http().get('/tasks/pinned').set(alice.auth).expect(200)
        ).body.data.map((t: { title: string }) => t.title),
      ).toEqual(['Riset']);
      expect(
        (await http().get('/tasks/pinned').set(bob.auth).expect(200)).body.data,
      ).toEqual([]);
      expect((await list(bob)).find((t) => t.title === 'Riset')!.pinned).toBe(
        false,
      );
      expect(await list(alice, '?pinned=true')).toHaveLength(1);
      await http()
        .delete(`/boards/${boardId}/tasks/${ids.Riset}/pin`)
        .set(alice.auth)
        .expect(204);
      expect(
        (await http().get('/tasks/pinned').set(alice.auth)).body.data,
      ).toEqual([]);
    });
  });

  describe('statistik papan, keluar, dan hapus', () => {
    it('statistik papan mengikuti tugas', async () => {
      const b = (
        await http().get(`/boards/${boardId}`).set(alice.auth).expect(200)
      ).body.data;
      expect(b).toMatchObject({
        taskCount: 4,
        doneCount: 1,
        progress: 25,
        memberCount: 2,
      });
    });

    it('anggota boleh menghapus tugas', async () => {
      await http()
        .delete(`/boards/${boardId}/tasks/${ids.Audit}`)
        .set(bob.auth)
        .expect(204);
      await http()
        .get(`/boards/${boardId}/tasks/${ids.Audit}`)
        .set(bob.auth)
        .expect(404);
    });

    it('anggota biasa tidak bisa mengeluarkan orang lain, tapi bisa keluar sendiri dan kehilangan akses', async () => {
      await http()
        .delete(`/boards/${boardId}/members/${alice.id}`)
        .set(bob.auth)
        .expect(403);
      await http()
        .delete(`/boards/${boardId}/members/${bob.id}`)
        .set(bob.auth)
        .expect(204);
      await http().get(`/boards/${boardId}`).set(bob.auth).expect(404);
    });

    it('hanya pemilik yang bisa menghapus papan; tugas ikut terhapus', async () => {
      await http()
        .post(`/boards/${boardId}/members`)
        .set(alice.auth)
        .send({ email: bob.email, role: 'admin' })
        .expect(201);
      await http()
        .delete(`/boards/${boardId}`)
        .set(bob.auth)
        .expect(403)
        .expect((r) => expect(r.body.error.code).toBe('NOT_BOARD_OWNER'));
      await http().delete(`/boards/${boardId}`).set(alice.auth).expect(204);
      await http().get(`/boards/${boardId}`).set(alice.auth).expect(404);
    });
  });
});
