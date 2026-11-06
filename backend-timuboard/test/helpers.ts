/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';

export async function mailToken(
  email: string,
  subject: string,
): Promise<string> {
  const q = `to:${email} subject:"${subject}"`;
  for (let i = 0; i < 25; i++) {
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
  throw new Error(`Email "${subject}" untuk ${email} tidak masuk ke Mailpit`);
}

export interface TestUser {
  id: string;
  email: string;
  auth: { Authorization: string };
}

/** Daftar, verifikasi lewat email di Mailpit, lalu login. */
export async function signup(
  app: INestApplication,
  label: string,
): Promise<TestUser> {
  const email = `${label}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@timuboard.test`;
  const password = 'rahasia123';
  const http = () => request(app.getHttpServer());
  const reg = await http()
    .post('/auth/register')
    .send({ name: `User ${label}`, email, password })
    .expect(201);
  await http()
    .post('/auth/verify-email')
    .send({ token: await mailToken(email, 'Verifikasi') })
    .expect(200);
  const login = await http()
    .post('/auth/login')
    .send({ email, password })
    .expect(200);
  return {
    id: reg.body.data.id as string,
    email,
    auth: { Authorization: `Bearer ${login.body.data.accessToken as string}` },
  };
}
