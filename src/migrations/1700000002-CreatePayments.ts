import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayments1700000002 implements MigrationInterface {
  name = 'CreatePayments1700000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id"               UUID           NOT NULL DEFAULT gen_random_uuid(),
        "order_id"         UUID           NOT NULL,
        "invoice_id"       VARCHAR        NOT NULL,
        "payment_address"  VARCHAR        NOT NULL,
        "payment_amount"   DECIMAL(18,8)  NOT NULL,
        "expiration_time"  TIMESTAMP      NOT NULL,
        "tx_hash"          VARCHAR,
        "paid_at"          TIMESTAMP,
        "created_at"       TIMESTAMP      NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments"              PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payments_invoice_id"   UNIQUE ("invoice_id"),
        CONSTRAINT "FK_payments_order"        FOREIGN KEY ("order_id")
          REFERENCES "orders" ("id") ON DELETE CASCADE
      )
    `);

    // Índice no invoice_id — usado em toda busca de webhook
    await queryRunner.query(`
      CREATE INDEX "IDX_payments_invoice_id" ON "payments" ("invoice_id")
    `);

    // Índice para o cron de expiração
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
  }
}
