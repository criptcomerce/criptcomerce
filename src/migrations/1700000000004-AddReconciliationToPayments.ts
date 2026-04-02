import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReconciliationToPayments1700000000004 implements MigrationInterface {
  name = 'AddReconciliationToPayments1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Colunas já criadas na migration 002 — esta migration é no-op para compatibilidade
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no-op
  }
}
