import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartialStatus1700000000005 implements MigrationInterface {
  name = 'AddPartialStatus1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "order_status_enum" ADD VALUE IF NOT EXISTS 'PARTIAL'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL não suporta remoção de valores de enum diretamente
  }
}
