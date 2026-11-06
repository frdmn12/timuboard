// Suite ini tidak menguji rate limit; matikan agar tidak berbagi batas 10/menit dengan suite auth.
process.env.THROTTLE_DISABLED = 'true';
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { signup, type TestUser } from './helpers';

type N = {
  id: string;
  type: string;
  actor: { id: string; name: string } | null;
  taskId: string | null;
  boardId: string | null;
  data: { taskTitle?: string; boardName?: string; preview?: string };
  read: boolean;
};
type Page = { items: N[]; nextBefore: string | null; unreadCount: number };

/** E2E nyata untuk notifikasi dalam aplikasi: butuh Postgres, Redis, dan Mailpit (docker compose). */
describe('Notifikasi (e2e)', () => {
  let app: INestApplication;
  let alice: TestUser; // admin papan
  let bob: TestUser; // anggota
  let carol: TestUser; // orang luar
  let boardId: string;
  let taskId: string;
  const http = () => request(app.getHttpServer());
  const page = async (u: TestUser, qs = '') =>
    (await http().get(`/notifications${qs}`).set(u.auth).expect(200)).body
      .data as Page;
  const types = async (u: TestUser) => (await page(u)).items.map((n) => n.type);
  const comment = (u: TestUser, body: string) =>
    http()
      .post(`/boards/${boardId}/tasks/${taskId}/comments`)
      .set(u.auth)
      .send({ body })
      .expect(201);

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
    boardId = (
      await http()
        .post('/boards')
        .set(alice.auth)
        .send({ name: 'Rilis v2' })
        .expect(201)
    ).body.data.id;
  }, 60_000);
  afterAll(() => app.close());

  it('menolak tanpa token (401)', async () => {
    await http().get('/notifications').expect(401);
    await http().get('/notifications/unread-count').expect(401);
    await http().post('/notifications/read-all').expect(401);
  });

  it('pengguna baru: kosong, hitungan 0', async () => {
    expect(await page(carol)).toEqual({
      items: [],
      nextBefore: null,
      unreadCount: 0,
    });
    expect(
      (
        await http()
          .get('/notifications/unread-count')
          .set(carol.auth)
          .expect(200)
      ).body.data,
    ).toEqual({ count: 0 });
  });

  it('ditambahkan ke papan → board_added untuk yang ditambahkan, bukan untuk pelaku', async () => {
    await http()
      .post(`/boards/${boardId}/members`)
      .set(alice.auth)
      .send({ email: bob.email })
      .expect(201);
    const n = (await page(bob)).items[0];
    expect(n).toMatchObject({
      type: 'board_added',
      boardId,
      taskId: null,
      read: false,
    });
    expect(n.actor).toEqual({ id: alice.id, name: 'User alice' });
    expect(n.data.boardName).toBe('Rilis v2');
    expect(await types(alice)).toEqual([]);
  });

  it('tugas diberi penanggung jawab → task_assigned; menugaskan diri sendiri tidak memberi notifikasi', async () => {
    taskId = (
      await http()
        .post(`/boards/${boardId}/tasks`)
        .set(alice.auth)
        .send({ title: 'Redesain onboarding', assigneeId: bob.id })
        .expect(201)
    ).body.data.id;
    expect(await types(bob)).toEqual(['task_assigned', 'board_added']);
    expect((await page(bob)).items[0].data.taskTitle).toBe(
      'Redesain onboarding',
    );
    await http()
      .post(`/boards/${boardId}/tasks`)
      .set(bob.auth)
      .send({ title: 'Punya sendiri', assigneeId: bob.id })
      .expect(201);
    expect(await types(bob)).toHaveLength(2); // tidak bertambah
    // Bob menugaskan Alice lewat PATCH → Alice dikabari
    await http()
      .patch(`/boards/${boardId}/tasks/${taskId}`)
      .set(bob.auth)
      .send({ assigneeId: alice.id })
      .expect(200);
    expect(await types(alice)).toEqual(['task_assigned']);
    // penanggung jawab sama (hanya judul berubah) = tidak ada notifikasi baru
    await http()
      .patch(`/boards/${boardId}/tasks/${taskId}`)
      .set(bob.auth)
      .send({ assigneeId: alice.id, title: 'Redesain onboarding v2' })
      .expect(200);
    expect(await types(alice)).toHaveLength(1);
    // dikembalikan ke Bob oleh Alice
    await http()
      .patch(`/boards/${boardId}/tasks/${taskId}`)
      .set(alice.auth)
      .send({ assigneeId: bob.id })
      .expect(200);
    expect(await types(bob)).toHaveLength(3);
  });

  it('komentar → penanggung jawab dan peserta diskusi dikabari, pelaku tidak', async () => {
    await comment(
      alice,
      'Mohon dicek desainnya ya, lengkap dengan catatan tambahan untuk tim.',
    );
    const bobFirst = (await page(bob)).items[0];
    expect(bobFirst).toMatchObject({ type: 'comment_added', taskId });
    expect(bobFirst.data.preview).toContain('Mohon dicek');
    expect(await types(alice)).not.toContain('comment_added'); // pelaku

    await comment(bob, 'Siap, saya kerjakan.');
    expect((await types(alice))[0]).toBe('comment_added'); // Alice pernah berkomentar → ikut dikabari
    await comment(alice, 'x'.repeat(500));
    expect((await page(bob)).items[0].data.preview).toHaveLength(120); // pratinjau dipotong
  });

  it('tugas masuk Review → admin dikabari; hanya saat benar-benar pindah ke Review', async () => {
    const before = (await types(alice)).filter(
      (t) => t === 'review_requested',
    ).length;
    await http()
      .post(`/boards/${boardId}/tasks/${taskId}/move`)
      .set(bob.auth)
      .send({ status: 'review', position: 0 })
      .expect(200);
    const review = (await page(alice)).items.find(
      (n) => n.type === 'review_requested',
    )!;
    expect(review).toMatchObject({ taskId });
    expect(review.actor!.id).toBe(bob.id);
    expect(
      (await types(alice)).filter((t) => t === 'review_requested'),
    ).toHaveLength(before + 1);
    // memindah dalam kolom Review yang sama tidak memicu lagi
    await http()
      .post(`/boards/${boardId}/tasks/${taskId}/move`)
      .set(bob.auth)
      .send({ status: 'review', position: 0 })
      .expect(200);
    expect(
      (await types(alice)).filter((t) => t === 'review_requested'),
    ).toHaveLength(before + 1);
    expect(await types(bob)).not.toContain('review_requested'); // pelaku bukan admin, tidak dikabari
  });

  it('preferensi: bawaan semua aktif; mematikan jenis menghentikan notifikasi jenis itu saja', async () => {
    expect(
      (await http().get('/notifications/preferences').set(bob.auth).expect(200))
        .body.data,
    ).toEqual({
      assigned: true,
      comment: true,
      review: true,
      boardAdded: true,
    });
    await http()
      .patch('/notifications/preferences')
      .set(bob.auth)
      .send({ comment: false })
      .expect(200)
      .expect((r) =>
        expect(r.body.data).toEqual({
          assigned: true,
          comment: false,
          review: true,
          boardAdded: true,
        }),
      );
    await http()
      .patch('/notifications/preferences')
      .set(bob.auth)
      .send({ comment: 'tidak' })
      .expect(400);
    await http()
      .patch('/notifications/preferences')
      .set(bob.auth)
      .send({ admin: true })
      .expect(400);
    const before = (await page(bob)).items.length;
    await comment(alice, 'Komentar saat Bob menonaktifkan komentar');
    expect((await page(bob)).items).toHaveLength(before); // tidak ada komentar baru untuk Bob
    await http()
      .post(`/boards/${boardId}/tasks`)
      .set(alice.auth)
      .send({ title: 'Masih ditugaskan', assigneeId: bob.id })
      .expect(201);
    expect((await page(bob)).items).toHaveLength(before + 1); // jenis lain tetap masuk
    expect(
      (await http().get('/notifications/preferences').set(bob.auth)).body.data
        .comment,
    ).toBe(false); // tersimpan
  });

  it('hitungan belum dibaca, tandai satu, filter unread, tandai semua', async () => {
    const all = await page(bob);
    expect(all.unreadCount).toBe(all.items.length);
    await http()
      .post(`/notifications/${all.items[0].id}/read`)
      .set(bob.auth)
      .expect(204);
    await http()
      .post(`/notifications/${all.items[0].id}/read`)
      .set(bob.auth)
      .expect(204); // idempoten
    expect((await page(bob)).unreadCount).toBe(all.items.length - 1);
    const unread = await page(bob, '?unread=true');
    expect(unread.items.every((n) => !n.read)).toBe(true);
    expect(unread.items).toHaveLength(all.items.length - 1);
    const res = await http()
      .post('/notifications/read-all')
      .set(bob.auth)
      .expect(200);
    expect(res.body.data.updated).toBe(all.items.length - 1);
    expect(
      (await http().get('/notifications/unread-count').set(bob.auth)).body.data
        .count,
    ).toBe(0);
    expect((await page(bob)).items.every((n) => n.read)).toBe(true);
  });

  it('paginasi: terbaru dulu, nextBefore memuat yang lebih lama, tanpa duplikat', async () => {
    const all = (await page(bob, '?limit=100')).items;
    expect(all.length).toBeGreaterThan(4);
    const p1 = await page(bob, '?limit=2');
    expect(p1.items.map((n) => n.id)).toEqual(all.slice(0, 2).map((n) => n.id));
    expect(p1.nextBefore).toEqual(expect.any(String));
    const p2 = await page(
      bob,
      `?limit=2&before=${encodeURIComponent(p1.nextBefore!)}`,
    );
    expect(p2.items.map((n) => n.id)).toEqual(all.slice(2, 4).map((n) => n.id));
    await http().get('/notifications?limit=0').set(bob.auth).expect(400);
    await http().get('/notifications?limit=101').set(bob.auth).expect(400);
  });

  it('notifikasi milik orang lain tidak bisa disentuh (404), UUID ngawur 400', async () => {
    const bobNotif = (await page(bob)).items[0];
    await http()
      .post(`/notifications/${bobNotif.id}/read`)
      .set(carol.auth)
      .expect(404);
    await http()
      .post('/notifications/00000000-0000-4000-8000-000000000000/read')
      .set(carol.auth)
      .expect(404);
    await http()
      .post('/notifications/bukan-uuid/read')
      .set(carol.auth)
      .expect(400);
    // read-all hanya memengaruhi pemiliknya
    await http()
      .post(`/boards/${boardId}/tasks`)
      .set(alice.auth)
      .send({ title: 'Baru lagi', assigneeId: bob.id })
      .expect(201);
    await http().post('/notifications/read-all').set(carol.auth).expect(200);
    expect((await page(bob)).unreadCount).toBe(1);
  });

  it('tugas dihapus → notifikasinya ikut hilang; papan dihapus → semuanya hilang', async () => {
    const withTask = (await page(bob, '?limit=100')).items.filter(
      (n) => n.taskId === taskId,
    ).length;
    expect(withTask).toBeGreaterThan(0);
    await http()
      .delete(`/boards/${boardId}/tasks/${taskId}`)
      .set(alice.auth)
      .expect(204);
    expect(
      (await page(bob, '?limit=100')).items.filter((n) => n.taskId === taskId),
    ).toHaveLength(0);
    await http().delete(`/boards/${boardId}`).set(alice.auth).expect(204);
    expect((await page(bob, '?limit=100')).items).toHaveLength(0);
    expect((await page(alice, '?limit=100')).items).toHaveLength(0);
  });
});
