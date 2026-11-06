/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
process.env.THROTTLE_DISABLED = 'true';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { GoogleTokenVerifier } from '../src/auth/google-token.verifier';
import { mailToken } from './helpers';

/** E2E: butuh Postgres berjalan. Verifier Google di-stub; tidak ada panggilan ke Google. */
describe('Auth Google (e2e)', () => {
  let app: INestApplication;
  const email = `g-${Date.now()}@timuboard.test`;
  const verify = jest.fn();

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GoogleTokenVerifier)
      .useValue({ verify })
      .compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    // Sudah listening: kalau tidak, supertest menyalakan server pada permintaan pertama dan balapan tidak terjadi.
    await app.listen(0);
  });
  afterAll(() => app.close());

  it('membuat akun, memasang cookie refresh, dan akses token dapat dipakai', async () => {
    verify.mockResolvedValue({
      sub: `sub-${Date.now()}`,
      email,
      emailVerified: true,
      name: 'Gina Google',
    });
    const res = await request(app.getHttpServer())
      .post('/auth/google')
      .send({ credential: 'stub' })
      .expect(200);
    expect(String(res.headers['set-cookie'])).toContain('refresh_token=');
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${res.body.data.accessToken}`)
      .expect(200);
  });

  it('akun Google-only tidak bisa login dengan password (jawaban generik)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'apa-saja-123' })
      .expect(401);
    expect(res.body.error?.code ?? res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('akun Google-only bisa menambah password lewat forgot-password, lalu login dengan password', async () => {
    const http = () => request(app.getHttpServer());
    await http().post('/auth/forgot-password').send({ email }).expect(200);
    const token = await mailToken(email, 'Atur ulang kata sandi');
    await http()
      .post('/auth/reset-password')
      .send({ token, password: 'sandi-baru-123' })
      .expect(200);
    await http()
      .post('/auth/login')
      .send({ email, password: 'sandi-baru-123' })
      .expect(200);
  });

  it('login Google pertama yang bersamaan untuk akun baru semuanya berhasil (tanpa 500)', async () => {
    const post = () =>
      request(app.getHttpServer())
        .post('/auth/google')
        .send({ credential: 'stub' });
    const N = 8;
    // Pemanasan: buka N koneksi pool DB sekaligus (akun berbeda-beda). Tanpa ini satu koneksi hangat
    // menyelesaikan transaksinya sebelum koneksi lain siap, dan balapan tidak pernah terjadi.
    let warm = 0;
    verify.mockImplementation(() => {
      const i = ++warm;
      return Promise.resolve({
        sub: `sub-warm-${Date.now()}-${i}`,
        email: `warm-${Date.now()}-${i}@timuboard.test`,
        emailVerified: true,
        name: 'Wawan Warmup',
      });
    });
    await Promise.all(Array.from({ length: N }, post));
    const racer = `race-${Date.now()}@timuboard.test`;
    const sub = `sub-race-${Date.now()}`;
    // Gerbang: semua permintaan menunggu di verifier sampai kedelapannya tiba, lalu masuk transaksi serentak.
    let arrived = 0;
    let open!: () => void;
    const gate = new Promise<void>((r) => (open = r));
    verify.mockImplementation(async () => {
      if (++arrived === N) open();
      await gate;
      return { sub, email: racer, emailVerified: true, name: 'Rani Racer' };
    });
    const res = await Promise.all(Array.from({ length: N }, post));
    expect(res.map((r) => r.status)).toEqual(Array(N).fill(200));
    expect(new Set(res.map((r) => r.body.data.user.id)).size).toBe(1);
  });
});
