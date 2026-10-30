/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { QueryFailedError } from 'typeorm';
import { AuthService } from './auth.service';

const user = {
  id: 'u1',
  name: 'Dewi',
  email: 'dewi@x.id',
  emailVerifiedAt: new Date(),
  createdAt: new Date(),
  passwordHash: bcrypt.hashSync('rahasia123', 4),
};

function setup(
  over: {
    users?: object;
    verification?: object;
    sessions?: object;
    mail?: object;
    reset?: object;
    google?: object;
  } = {},
) {
  const users = {
    findByEmail: jest.fn(),
    findByEmailWithPassword: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    markEmailVerified: jest.fn(),
    updatePassword: jest.fn(),
    findForGoogleLogin: jest.fn(),
    linkGoogle: jest.fn(),
    ...over.users,
  };
  const tokens = { signAccessToken: jest.fn().mockResolvedValue('access') };
  const sessions = {
    create: jest.fn().mockResolvedValue('refresh'),
    rotate: jest.fn(),
    revoke: jest.fn(),
    revokeAllForUser: jest.fn(),
    ...over.sessions,
  };
  const verification = {
    issue: jest.fn().mockResolvedValue('tok'),
    consume: jest.fn(),
    ...over.verification,
  };
  const reset = {
    issue: jest.fn().mockResolvedValue('rtok'),
    consume: jest.fn(),
    ...over.reset,
  };
  const mail = {
    sendVerification: jest.fn().mockResolvedValue(true),
    sendPasswordReset: jest.fn().mockResolvedValue(true),
    ...over.mail,
  };
  const google = { verify: jest.fn(), ...over.google };
  const config = { getOrThrow: jest.fn().mockReturnValue(4) };
  const dataSource = {
    transaction: jest.fn((fn: (m: object) => unknown) => fn({})),
  };
  const svc = new AuthService(
    users as never,
    tokens as never,
    sessions as never,
    verification as never,
    reset as never,
    mail as never,
    config as never,
    dataSource as never,
    google as never,
  );
  return { svc, users, tokens, sessions, verification, mail, reset, google };
}

describe('AuthService', () => {
  describe('register', () => {
    it('membuat akun, token verifikasi, lalu mengirim email', async () => {
      const { svc, users, mail } = setup();
      users.findByEmail.mockResolvedValue(null);
      users.create.mockResolvedValue({
        id: 'u1',
        name: 'Dewi',
        email: 'dewi@x.id',
      });
      const res = await svc.register({
        name: 'Dewi',
        email: 'dewi@x.id',
        password: 'rahasia123',
      });
      expect(res).toMatchObject({ id: 'u1', verificationEmailSent: true });
      expect(users.create.mock.calls[0][0].passwordHash).not.toBe('rahasia123');
      expect(mail.sendVerification).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'dewi@x.id' }),
        'tok',
      );
    });

    it('menolak email yang sudah terdaftar dengan 409', async () => {
      const { svc, users } = setup();
      users.findByEmail.mockResolvedValue(user);
      await expect(
        svc.register({ name: 'D', email: 'dewi@x.id', password: 'rahasia123' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('tetap sukses bila email gagal terkirim, dan memberi tahu klien', async () => {
      const { svc, users } = setup({
        mail: { sendVerification: jest.fn().mockResolvedValue(false) },
      });
      users.findByEmail.mockResolvedValue(null);
      users.create.mockResolvedValue({ id: 'u1', name: 'D', email: 'd@x.id' });
      expect(
        (
          await svc.register({
            name: 'D',
            email: 'd@x.id',
            password: 'rahasia123',
          })
        ).verificationEmailSent,
      ).toBe(false);
    });
  });

  describe('login', () => {
    it('menolak email tak dikenal dan kata sandi salah dengan pesan yang sama', async () => {
      const { svc, users } = setup();
      users.findByEmailWithPassword
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(user);
      const a = await svc
        .login({ email: 'a@x.id', password: 'rahasia123' }, null)
        .catch((e) => e);
      const b = await svc
        .login({ email: 'dewi@x.id', password: 'salah-salah' }, null)
        .catch((e) => e);
      expect(a).toBeInstanceOf(UnauthorizedException);
      expect(b.getResponse()).toEqual(a.getResponse());
    });

    it('menolak akun yang belum diverifikasi dengan 403 EMAIL_NOT_VERIFIED', async () => {
      const { svc, users } = setup();
      users.findByEmailWithPassword.mockResolvedValue({
        ...user,
        emailVerifiedAt: null,
      });
      const err = await svc
        .login({ email: 'dewi@x.id', password: 'rahasia123' }, null)
        .catch((e) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.getResponse()).toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
    });

    it('mengembalikan access token dan refresh token untuk akun terverifikasi', async () => {
      const { svc, users } = setup();
      users.findByEmailWithPassword.mockResolvedValue(user);
      const { response, refreshToken } = await svc.login(
        { email: 'dewi@x.id', password: 'rahasia123' },
        'jest',
      );
      expect(response.accessToken).toBe('access');
      expect(response.user).not.toHaveProperty('passwordHash');
      expect(refreshToken).toBe('refresh');
    });
  });

  describe('verifyEmail', () => {
    it('menandai email terverifikasi saat token valid', async () => {
      const { svc, users, verification } = setup();
      verification.consume.mockResolvedValue({
        status: 'verified',
        userId: 'u1',
      });
      await svc.verifyEmail('t');
      expect(users.markEmailVerified).toHaveBeenCalledWith(
        'u1',
        expect.anything(),
      );
    });

    it('idempoten untuk tautan yang sudah dipakai', async () => {
      const { svc, users, verification } = setup();
      verification.consume.mockResolvedValue({
        status: 'already-used',
        userId: 'u1',
      });
      await expect(svc.verifyEmail('t')).resolves.toBeDefined();
      expect(users.markEmailVerified).not.toHaveBeenCalled();
    });

    it('menolak token tak valid atau kedaluwarsa dengan 400', async () => {
      const { svc, verification } = setup();
      verification.consume.mockResolvedValue({ status: 'invalid' });
      await expect(svc.verifyEmail('t')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('refresh', () => {
    it('menolak refresh token yang tidak valid', async () => {
      const { svc, sessions } = setup();
      sessions.rotate.mockResolvedValue(null);
      await expect(svc.refresh('x', null)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('resendVerification', () => {
    it('menjawab sama untuk email yang tidak ada dan tidak mengirim email', async () => {
      const { svc, users, mail } = setup();
      users.findByEmail.mockResolvedValue(null);
      await svc.resendVerification('nope@x.id');
      expect(mail.sendVerification).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('mengirim email atur ulang untuk email terdaftar', async () => {
      const { svc, users, mail } = setup();
      users.findByEmail.mockResolvedValue(user);
      await svc.forgotPassword('dewi@x.id');
      expect(mail.sendPasswordReset).toHaveBeenCalledWith(user, 'rtok');
    });

    it('menjawab sama dan tidak mengirim apa pun untuk email tak dikenal', async () => {
      const { svc, users, mail } = setup();
      users.findByEmail.mockResolvedValueOnce(user).mockResolvedValueOnce(null);
      const a = await svc.forgotPassword('dewi@x.id');
      const b = await svc.forgotPassword('nope@x.id');
      expect(b).toEqual(a);
      expect(mail.sendPasswordReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetPassword', () => {
    it('mengganti kata sandi (di-hash) dan mencabut semua sesi', async () => {
      const { svc, users, sessions, reset } = setup();
      reset.consume.mockResolvedValue({ status: 'ok', userId: 'u1' });
      await svc.resetPassword('t', 'sandi-baru-123');
      const hash = users.updatePassword.mock.calls[0][1];
      expect(hash).not.toBe('sandi-baru-123');
      expect(await bcrypt.compare('sandi-baru-123', hash)).toBe(true);
      expect(sessions.revokeAllForUser).toHaveBeenCalledWith('u1');
    });

    it('menolak token tidak valid atau sudah dipakai dengan 400', async () => {
      const { svc, users, reset } = setup();
      reset.consume.mockResolvedValue({ status: 'invalid' });
      await expect(
        svc.resetPassword('t', 'sandi-baru-123'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(users.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('loginWithGoogle', () => {
    const profile = {
      sub: 'g1',
      email: 'dewi@x.id',
      emailVerified: true,
      name: 'Dewi',
    };
    const uniqueViolation = () =>
      new QueryFailedError('insert', [], { code: '23505' } as never);

    it('membuat akun baru tanpa password, langsung terverifikasi', async () => {
      const { svc, users, google, sessions } = setup();
      google.verify.mockResolvedValue(profile);
      users.findForGoogleLogin.mockResolvedValue(null);
      users.create.mockResolvedValue({ ...user, passwordHash: null });
      const res = await svc.loginWithGoogle('cred', 'ua');
      expect(users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'dewi@x.id',
          passwordHash: null,
          googleSub: 'g1',
          emailVerifiedAt: expect.any(Date),
        }),
        expect.anything(),
      );
      expect(res.refreshToken).toBe('refresh');
      expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('masuk langsung bila googleSub sudah tertaut', async () => {
      const { svc, users, google } = setup();
      google.verify.mockResolvedValue(profile);
      users.findForGoogleLogin.mockResolvedValue({ ...user, googleSub: 'g1' });
      await svc.loginWithGoogle('cred', null);
      expect(users.linkGoogle).not.toHaveBeenCalled();
      expect(users.create).not.toHaveBeenCalled();
    });

    it('menautkan akun terverifikasi tanpa menyentuh password', async () => {
      const { svc, users, google, sessions } = setup();
      google.verify.mockResolvedValue(profile);
      users.findForGoogleLogin.mockResolvedValue({ ...user, googleSub: null });
      await svc.loginWithGoogle('cred', null);
      expect(users.linkGoogle).toHaveBeenCalledWith(
        'u1',
        'g1',
        false,
        expect.anything(),
      );
      expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('menautkan akun belum terverifikasi: password dikosongkan, sesi dicabut', async () => {
      const { svc, users, google, sessions } = setup();
      google.verify.mockResolvedValue(profile);
      users.findForGoogleLogin.mockResolvedValue({
        ...user,
        emailVerifiedAt: null,
        googleSub: null,
      });
      await svc.loginWithGoogle('cred', null);
      expect(users.linkGoogle).toHaveBeenCalledWith(
        'u1',
        'g1',
        true,
        expect.anything(),
      );
      expect(sessions.revokeAllForUser).toHaveBeenCalledWith(
        'u1',
        expect.anything(),
      );
    });

    it('menolak akun yang sudah tertaut ke akun Google lain', async () => {
      const { svc, users, google } = setup();
      google.verify.mockResolvedValue(profile);
      users.findForGoogleLogin.mockResolvedValue({ ...user, googleSub: 'g2' });
      await expect(svc.loginWithGoogle('cred', null)).rejects.toMatchObject({
        response: { code: 'INVALID_GOOGLE_TOKEN' },
      });
      expect(users.linkGoogle).not.toHaveBeenCalled();
    });

    it('menolak email Google yang belum terverifikasi', async () => {
      const { svc, users, google } = setup();
      google.verify.mockResolvedValue({ ...profile, emailVerified: false });
      await expect(svc.loginWithGoogle('cred', null)).rejects.toMatchObject({
        response: { code: 'GOOGLE_EMAIL_NOT_VERIFIED' },
      });
      expect(users.create).not.toHaveBeenCalled();
    });

    it('balapan pembuatan akun: unique violation dicari ulang sekali lalu berhasil', async () => {
      const { svc, users, google } = setup();
      google.verify.mockResolvedValue(profile);
      users.findForGoogleLogin
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...user, googleSub: 'g1' });
      users.create.mockRejectedValueOnce(uniqueViolation());
      const res = await svc.loginWithGoogle('cred', null);
      expect(users.findForGoogleLogin).toHaveBeenCalledTimes(2);
      expect(res.refreshToken).toBe('refresh');
    });

    it('galat selain unique violation tidak di-retry', async () => {
      const { svc, users, google } = setup();
      google.verify.mockResolvedValue(profile);
      users.findForGoogleLogin.mockResolvedValue(null);
      users.create.mockRejectedValue(new Error('db down'));
      await expect(svc.loginWithGoogle('cred', null)).rejects.toThrow(
        'db down',
      );
      expect(users.findForGoogleLogin).toHaveBeenCalledTimes(1);
    });
  });
});
