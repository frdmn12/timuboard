import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  private repo(manager?: EntityManager) {
    return manager ? manager.getRepository(User) : this.users;
  }

  create(
    data: Pick<User, 'name' | 'email' | 'passwordHash'> &
      Partial<Pick<User, 'googleSub' | 'emailVerifiedAt'>>,
    manager?: EntityManager,
  ) {
    const repo = this.repo(manager);
    return repo.save(repo.create(data));
  }

  findById(id: string) {
    return this.users.findOne({ where: { id } });
  }

  findByEmail(email: string) {
    return this.users.findOne({ where: { email } });
  }

  /**
   * Cari akun untuk login Google: lewat `googleSub`, lalu lewat email. Barisnya dikunci sampai
   * transaksi selesai, sehingga dua login bersamaan atas akun yang sama berjalan berurutan.
   */
  async findForGoogleLogin(
    googleSub: string,
    email: string,
    manager: EntityManager,
  ) {
    const repo = manager.getRepository(User);
    const lock = { mode: 'pessimistic_write' as const };
    return (
      (await repo.findOne({ where: { googleSub }, lock })) ??
      (await repo.findOne({ where: { email }, lock }))
    );
  }

  /**
   * Tautkan akun Google. Pada akun yang emailnya belum terverifikasi, password dikosongkan
   * (cegah pra-pendaftaran oleh pihak lain) dan email ditandai terverifikasi oleh Google.
   */
  async linkGoogle(
    id: string,
    googleSub: string,
    wasUnverified: boolean,
    manager?: EntityManager,
  ) {
    await this.repo(manager).update(
      { id },
      wasUnverified
        ? { googleSub, passwordHash: null, emailVerifiedAt: new Date() }
        : { googleSub },
    );
  }

  /** Hanya untuk login: memuat passwordHash yang biasanya disembunyikan. */
  findByEmailWithPassword(email: string) {
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email })
      .getOne();
  }

  async updatePassword(
    id: string,
    passwordHash: string,
    manager?: EntityManager,
  ) {
    await this.repo(manager).update({ id }, { passwordHash });
  }

  async markEmailVerified(id: string, manager?: EntityManager) {
    await this.repo(manager).update({ id }, { emailVerifiedAt: new Date() });
  }
}
