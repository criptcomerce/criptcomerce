import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReconciledAtToPayments1700000000004 implements MigrationInterface {
  name = 'AddReconciledAtToPayments1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Marca quando o reconciliation worker verificou este pagamento por último
    await queryRunner.query(`
      ALTER TABLE "payments"
        ADD COLUMN "last_reconciled_at" TIMESTAMP,
        ADD COLUMN "reconciliation_attempts" INTEGER NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payments_reconciliation"
        ON "payments" ("last_reconciled_at", "paid_at")
        WHERE "paid_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_payments_reconciliation"`);
    await queryRunner.query(`
      ALTER TABLE "payments"
        DROP COLUMN "last_reconciled_at",
        DROP COLUMN "reconciliation_attempts"
    `);
  }
}
