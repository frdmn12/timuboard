import { MigrationInterface, QueryRunner } from 'typeorm';

export class GoogleSignIn1792000000000 implements MigrationInterface {
  name = 'GoogleSignIn1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "googleSub" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_users_googleSub" UNIQUE ("googleSub")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_users_googleSub"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "googleSub"`);
    await queryRunner.query(
      `UPDATE "users" SET "passwordHash" = '' WHERE "passwordHash" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "passwordHash" SET NOT NULL`,
    );
  }
}
