import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayments1700000000002 implements MigrationInterface {
  name = 'CreatePayments1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "payments_status_enum" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED')
    `);
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id"                       UUID                    NOT NULL DEFAULT gen_random_uuid(),
        "order_id"                 UUID                    NOT NULL,
        "invoice_id"               VARCHAR                 NOT NULL,
        "payment_address"          VARCHAR                 NOT NULL,
        "payment_amount"           DECIMAL(18,8)           NOT NULL,
        "currency"                 VARCHAR                 NOT NULL DEFAULT 'BTC',
        "status"                   "payments_status_enum"  NOT NULL DEFAULT 'PENDING',
        "expiration_time"          TIMESTAMP               NOT NULL,
        "tx_hash"                  VARCHAR,
        "paid_at"                  TIMESTAMP,
        "last_reconciled_at"       TIMESTAMP,
        "reconciliation_attempts"  INTEGER                 NOT NULL DEFAULT 0,
        "created_at"               TIMESTAMP               NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments"            PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payments_invoice_id" UNIQUE ("invoice_id"),
        CONSTRAINT "FK_payments_order"      FOREIGN KEY ("order_id")
          REFERENCES "orders" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_payments_invoice_id" ON "payments" ("invoice_id")`);
    await queryRunner.query(`
      CREATE INDEX "IDX_payments_expiration_paid"
        ON "payments" ("expiration_time", "paid_at")
        WHERE "paid_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_payments_expiration_paid"`);
    await queryRunner.query(`DROP INDEX "IDX_payments_invoice_id"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TYPE "payments_status_enum"`);
  }
}
