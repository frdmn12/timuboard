import { UsersService } from './users.service';

describe('UsersService.linkGoogle', () => {
  const setup = () => {
    const repo = { update: jest.fn() };
    return { repo, svc: new UsersService(repo as never) };
  };

  it('akun belum terverifikasi: password dikosongkan dan email ditandai terverifikasi', async () => {
    const { svc, repo } = setup();
    await svc.linkGoogle('u1', 'g1', true);
    expect(repo.update).toHaveBeenCalledWith(
      { id: 'u1' },
      {
        googleSub: 'g1',
        passwordHash: null,
        emailVerifiedAt: expect.any(Date),
      },
    );
  });

  it('akun terverifikasi: hanya googleSub yang ditulis', async () => {
    const { svc, repo } = setup();
    await svc.linkGoogle('u1', 'g1', false);
    expect(repo.update).toHaveBeenCalledWith({ id: 'u1' }, { googleSub: 'g1' });
  });
});
