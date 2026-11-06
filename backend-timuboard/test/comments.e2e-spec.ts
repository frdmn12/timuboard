/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
// Suite ini tidak menguji rate limit; matikan agar tidak berbagi batas 10/menit dengan suite auth.
process.env.THROTTLE_DISABLED = 'true';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { signup, type TestUser } from './helpers';

/** E2E nyata untuk komentar tugas: butuh Postgres, Redis, dan Mailpit (docker compose). */
describe('Komentar tugas (e2e)', () => {
  let app: INestApplication;
  let alice: TestUser; // admin papan
  let bob: TestUser; // anggota biasa
  let carol: TestUser; // bukan anggota
  let boardId: string;
  let taskId: string;
  let otherTaskId: string;
  const http = () => request(app.getHttpServer());
  const url = (t = taskId) => `/boards/${boardId}/tasks/${t}/comments`;

  const post = async (user: TestUser, body: string) =>
    (await http().post(url()).set(user.auth).send({ body }).expect(201)).body
      .data;
  const listPage = async (user: TestUser, qs = '') =>
    (
      await http()
        .get(url() + qs)
        .set(user.auth)
        .expect(200)
    ).body.data as {
      items: {
        id: string;
        body: string;
        canEdit: boolean;
        canDelete: boolean;
        edited: boolean;
        author: { id: string; name: string } | null;
      }[];
      nextBefore: string | null;
    };

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
        .send({ name: 'Komentar' })
        .expect(201)
    ).body.data.id;
    await http()
      .post(`/boards/${boardId}/members`)
      .set(alice.auth)
      .send({ email: bob.email })
      .expect(201);
    taskId = (
      await http()
        .post(`/boards/${boardId}/tasks`)
        .set(alice.auth)
        .send({ title: 'Tugas A' })
        .expect(201)
    ).body.data.id;
    otherTaskId = (
      await http()
        .post(`/boards/${boardId}/tasks`)
        .set(alice.auth)
        .send({ title: 'Tugas B' })
        .expect(201)
    ).body.data.id;
  }, 60_000);
  afterAll(() => app.close());

  it('menolak tanpa token (401); bukan anggota papan = 404', async () => {
    await http().get(url()).expect(401);
    await http().get(url()).set(carol.auth).expect(404);
    await http().post(url()).set(carol.auth).send({ body: 'halo' }).expect(404);
  });

  it('membuat komentar: teks dipangkas, penulis tercatat, hak edit dan hapus benar', async () => {
    const c = await post(alice, '  Brief sudah saya kirim.  ');
    expect(c).toMatchObject({
      body: 'Brief sudah saya kirim.',
      edited: false,
      canEdit: true,
      canDelete: true,
      taskId,
    });
    expect(c.author).toEqual({ id: alice.id, name: 'User alice' });
  });

  it('validasi: kosong, spasi saja, kepanjangan, dan properti asing ditolak (400)', async () => {
    await http().post(url()).set(alice.auth).send({ body: '' }).expect(400);
    await http().post(url()).set(alice.auth).send({ body: '   ' }).expect(400);
    await http()
      .post(url())
      .set(alice.auth)
      .send({ body: 'x'.repeat(2001) })
      .expect(400);
    await http()
      .post(url())
      .set(alice.auth)
      .send({ body: 'ok', authorId: bob.id })
      .expect(400);
    await http()
      .post(url())
      .set(alice.auth)
      .send({ body: 'x'.repeat(2000) })
      .expect(201); // batas pas diterima
  });

  it('komentar milik tugas lain/UUID ngawur: 404 dan 400', async () => {
    await http()
      .get(url('00000000-0000-4000-8000-000000000000'))
      .set(alice.auth)
      .expect(404);
    await http()
      .get(`/boards/${boardId}/tasks/bukan-uuid/comments`)
      .set(alice.auth)
      .expect(400);
  });

  it('daftar berurutan lama ke baru, dan hak tiap pengguna berbeda', async () => {
    await post(bob, 'Siap, saya cek.');
    const asBob = await listPage(bob);
    expect(asBob.items.map((i) => i.body).slice(0, 1)).toEqual([
      'Brief sudah saya kirim.',
    ]);
    expect(asBob.items.at(-1)!.body).toBe('Siap, saya cek.');
    const aliceComment = asBob.items[0];
    expect(aliceComment).toMatchObject({ canEdit: false, canDelete: false }); // Bob bukan penulis maupun admin
    const asAlice = await listPage(alice);
    expect(asAlice.items.at(-1)).toMatchObject({
      canEdit: false,
      canDelete: true,
    }); // admin boleh menghapus komentar Bob
  });

  it('jumlah komentar muncul di respons tugas (satu tugas dan daftar)', async () => {
    const one = await http()
      .get(`/boards/${boardId}/tasks/${taskId}`)
      .set(bob.auth)
      .expect(200);
    expect(one.body.data.commentCount).toBe(3);
    const all = (
      await http().get(`/boards/${boardId}/tasks`).set(bob.auth).expect(200)
    ).body.data as { id: string; commentCount: number }[];
    expect(all.find((t) => t.id === taskId)!.commentCount).toBe(3);
    expect(all.find((t) => t.id === otherTaskId)!.commentCount).toBe(0);
  });

  it('paginasi: halaman terbaru dulu, nextBefore memuat yang lebih lama, tanpa duplikat', async () => {
    for (let i = 1; i <= 3; i++) await post(alice, `Susulan ${i}`);
    const p1 = await listPage(alice, '?limit=2');
    expect(p1.items.map((i) => i.body)).toEqual(['Susulan 2', 'Susulan 3']);
    expect(p1.nextBefore).toEqual(expect.any(String));
    const p2 = await listPage(
      alice,
      `?limit=2&before=${encodeURIComponent(p1.nextBefore!)}`,
    );
    expect(p2.items.map((i) => i.body)).toEqual([
      'Siap, saya cek.',
      'Susulan 1',
    ]);
    const seen = new Set([...p1.items, ...p2.items].map((i) => i.id));
    expect(seen.size).toBe(4);
    await http()
      .get(url() + '?limit=0')
      .set(alice.auth)
      .expect(400);
    await http()
      .get(url() + '?limit=101')
      .set(alice.auth)
      .expect(400);
  });

  it('hanya penulis yang boleh mengedit (admin pun tidak); edit menandai edited', async () => {
    const bobComment = (await listPage(bob)).items.find(
      (i) => i.body === 'Siap, saya cek.',
    )!;
    await http()
      .patch(`${url()}/${bobComment.id}`)
      .set(alice.auth)
      .send({ body: 'Diretas' })
      .expect(403)
      .expect((r) => expect(r.body.error.code).toBe('NOT_COMMENT_AUTHOR'));
    const same = await http()
      .patch(`${url()}/${bobComment.id}`)
      .set(bob.auth)
      .send({ body: 'Siap, saya cek.' })
      .expect(200);
    expect(same.body.data.edited).toBe(false); // isi tidak berubah = bukan edit
    const edited = await http()
      .patch(`${url()}/${bobComment.id}`)
      .set(bob.auth)
      .send({ body: 'Siap, sudah saya cek.' })
      .expect(200);
    expect(edited.body.data).toMatchObject({
      body: 'Siap, sudah saya cek.',
      edited: true,
      canEdit: true,
    });
    await http()
      .patch(`${url()}/${bobComment.id}`)
      .set(bob.auth)
      .send({ body: '' })
      .expect(400);
  });

  it('hapus: anggota biasa tidak bisa menghapus komentar orang lain; admin bisa; penulis bisa miliknya', async () => {
    const items = (await listPage(alice, '?limit=100')).items;
    const aliceOwn = items.find((i) => i.body === 'Brief sudah saya kirim.')!;
    const bobOwn = items.find((i) => i.body === 'Siap, sudah saya cek.')!;
    await http().delete(`${url()}/${aliceOwn.id}`).set(bob.auth).expect(403);
    await http().delete(`${url()}/${bobOwn.id}`).set(alice.auth).expect(204); // admin menghapus komentar Bob
    await post(bob, 'Komentar kedua Bob');
    const second = (await listPage(bob, '?limit=100')).items.find(
      (i) => i.body === 'Komentar kedua Bob',
    )!;
    await http().delete(`${url()}/${second.id}`).set(bob.auth).expect(204); // penulis menghapus miliknya
    await http().delete(`${url()}/${second.id}`).set(bob.auth).expect(404);
    await http()
      .get(`/boards/${boardId}/tasks/${taskId}`)
      .set(bob.auth)
      .expect((r) => expect(r.body.data.commentCount).toBe(5));
  });

  it('komentar tidak bisa diakses lewat tugas lain', async () => {
    const some = (await listPage(alice)).items[0];
    await http()
      .patch(`/boards/${boardId}/tasks/${otherTaskId}/comments/${some.id}`)
      .set(alice.auth)
      .send({ body: 'x' })
      .expect(404);
    await http()
      .delete(`/boards/${boardId}/tasks/${otherTaskId}/comments/${some.id}`)
      .set(alice.auth)
      .expect(404);
  });

  it('anggota yang keluar kehilangan akses ke komentar; tugas dihapus = komentar ikut hilang', async () => {
    await http()
      .delete(`/boards/${boardId}/members/${bob.id}`)
      .set(bob.auth)
      .expect(204);
    await http().get(url()).set(bob.auth).expect(404);
    await http()
      .delete(`/boards/${boardId}/tasks/${taskId}`)
      .set(alice.auth)
      .expect(204);
    await http().get(url()).set(alice.auth).expect(404);
  });
});
