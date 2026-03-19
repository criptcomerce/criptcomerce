import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrders1700000000001 implements MigrationInterface {
  name = 'CreateOrders1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enum de status do pedido
    await queryRunner.query(`
      CREATE TYPE "order_status_enum" AS ENUM ('PENDING', 'PAID', 'EXPIRED')
    `);

    // Enum de moeda do pedido
    await queryRunner.query(`
      CREATE TYPE "order_currency_enum" AS ENUM ('BTC', 'USDT')
    `);

    // Tabela orders
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id"          UUID              NOT NULL DEFAULT gen_random_uuid(),
        "amount_usd"  DECIMAL(18,2)     NOT NULL,
        "currency"    "order_currency_enum" NOT NULL,
        "status"      "order_status_enum"   NOT NULL DEFAULT 'PENDING',
        "created_at"  TIMESTAMP         NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders" PRIMARY KEY ("id")
      )
    `);

    // Índices úteis para queries de cron jobs
    await queryRunner.query(`
      CREATE INDEX "IDX_orders_status" ON "orders" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_orders_created_at" ON "orders" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_orders_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_status"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TYPE "order_currency_enum"`);
    await queryRunner.query(`DROP TYPE "order_status_enum"`);
  }
}
