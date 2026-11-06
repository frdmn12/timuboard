/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

/**
 * E2E nyata: butuh Postgres dan Mailpit berjalan (`docker compose up -d postgres mailpit`)
 * serta variabel lingkungan dari .env.
 */
const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';

async function mailToken(email: string, subject?: string): Promise<string> {
  const q = `to:${email}${subject ? ` subject:"${subject}"` : ''}`;
  for (let i = 0; i < 20; i++) {
    const list = (await (
      await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(q)}`)
    ).json()) as { messages: { ID: string }[] };
    if (list.messages[0]) {
      const msg = (await (
        await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)
      ).json()) as { Text: string };
      return /token=([0-9a-f]{64})/.exec(msg.Text)![1];
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Email verifikasi tidak masuk ke Mailpit');
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const email = `e2e-${Date.now()}@timuboard.test`;
  const password = 'rahasia123';
  let refreshCookie = '';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(() => app.close());

  const http = () => request(app.getHttpServer());

  it('mendaftar, mengirim email verifikasi, dan menolak email ganda (409)', async () => {
    await http()
      .post('/auth/register')
      .send({ name: 'E2E', email, password })
      .expect(201)
      .expect((r) => {
        expect(r.body.data.verificationEmailSent).toBe(true);
      });
    await http()
      .post('/auth/register')
      .send({ name: 'E2E', email, password })
      .expect(409);
  });

  it('menolak payload tidak valid dan properti asing (400)', () =>
    http()
      .post('/auth/register')
      .send({ name: '', email: 'x', password: '1', admin: true })
      .expect(400));

  it('menolak login sebelum email diverifikasi (403)', () =>
    http()
      .post('/auth/login')
      .send({ email, password })
      .expect(403)
      .expect((r) => expect(r.body.error.code).toBe('EMAIL_NOT_VERIFIED')));

  it('memverifikasi email lewat token dari email', async () => {
    const token = await mailToken(email, 'Verifikasi');
    await http().post('/auth/verify-email').send({ token }).expect(200);
    await http().post('/auth/verify-email').send({ token }).expect(200); // idempoten
  });

  it('login: access token di body, refresh token di cookie httpOnly SameSite=Strict', async () => {
    const res = await http()
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    refreshCookie = cookie.split(';')[0];
    await http()
      .get('/users/me')
      .set('Authorization', `Bearer ${res.body.data.accessToken}`)
      .expect(200)
      .expect((r) => {
        expect(r.body.data.email).toBe(email);
        expect(r.body.data).not.toHaveProperty('passwordHash');
      });
  });

  it('route terlindungi menolak tanpa token (401)', () =>
    http().get('/users/me').expect(401));

  it('refresh berotasi, dan pemakaian ulang token lama mencabut seluruh sesi', async () => {
    const first = await http()
      .post('/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);
    const rotated = (
      first.headers['set-cookie'] as unknown as string[]
    )[0].split(';')[0];
    expect(rotated).not.toBe(refreshCookie);
    await http().post('/auth/refresh').set('Cookie', refreshCookie).expect(401); // token lama dipakai ulang
    await http().post('/auth/refresh').set('Cookie', rotated).expect(401); // sesi baru ikut dicabut
  });

  it('logout mencabut sesi', async () => {
    const login = await http()
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const cookie = (
      login.headers['set-cookie'] as unknown as string[]
    )[0].split(';')[0];
    await http().post('/auth/logout').set('Cookie', cookie).expect(200);
    await http().post('/auth/refresh').set('Cookie', cookie).expect(401);
  });

  describe('lupa kata sandi', () => {
    const newPassword = 'sandi-baru-456';
    let sessionCookie = '';

    it('menjawab sama untuk email terdaftar maupun tidak, dan mengirim email hanya untuk yang terdaftar', async () => {
      const login = await http()
        .post('/auth/login')
        .send({ email, password })
        .expect(200);
      sessionCookie = (
        login.headers['set-cookie'] as unknown as string[]
      )[0].split(';')[0];
      const known = await http()
        .post('/auth/forgot-password')
        .send({ email })
        .expect(200);
      const unknown = await http()
        .post('/auth/forgot-password')
        .send({ email: `tidak-ada-${Date.now()}@timuboard.test` })
        .expect(200);
      expect(unknown.body.data).toEqual(known.body.data);
    });

    it('menolak token palsu (400)', () =>
      http()
        .post('/auth/reset-password')
        .send({ token: 'a'.repeat(64), password: newPassword })
        .expect(400));

    it('menolak kata sandi baru yang terlalu pendek (400)', async () => {
      const token = await mailToken(email, 'Atur ulang');
      await http()
        .post('/auth/reset-password')
        .send({ token, password: '123' })
        .expect(400);
    });

    it('mengganti kata sandi lewat token email, token sekali pakai, dan sesi lama dicabut', async () => {
      const token = await mailToken(email, 'Atur ulang');
      await http()
        .post('/auth/reset-password')
        .send({ token, password: newPassword })
        .expect(200);
      await http()
        .post('/auth/reset-password')
        .send({ token, password: 'lain-lagi-789' })
        .expect(400);
      await http().post('/auth/login').send({ email, password }).expect(401);
      await http()
        .post('/auth/login')
        .send({ email, password: newPassword })
        .expect(200);
      await http()
        .post('/auth/refresh')
        .set('Cookie', sessionCookie)
        .expect(401);
    });
  });
});
