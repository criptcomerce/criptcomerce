import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductsAndOrderFields1700000000006 implements MigrationInterface {
  name = 'AddProductsAndOrderFields1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "products" (
        "id"          UUID          NOT NULL DEFAULT gen_random_uuid(),
        "name"        VARCHAR       NOT NULL,
        "description" TEXT,
        "price_usd"   DECIMAL(18,2) NOT NULL,
        "image_url"   VARCHAR,
        "active"      BOOLEAN       NOT NULL DEFAULT true,
        "created_at"  TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN IF NOT EXISTS "customer_name"    VARCHAR,
        ADD COLUMN IF NOT EXISTS "customer_email"   VARCHAR,
        ADD COLUMN IF NOT EXISTS "shipping_address" TEXT,
        ADD COLUMN IF NOT EXISTS "coingate_invoice_id" VARCHAR
    `);
    await queryRunner.query(`ALTER TYPE "order_currency_enum" ADD VALUE IF NOT EXISTS 'ETH'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`
      ALTER TABLE "orders"
        DROP COLUMN IF EXISTS "customer_name",
        DROP COLUMN IF EXISTS "customer_email",
        DROP COLUMN IF EXISTS "shipping_address",
        DROP COLUMN IF EXISTS "coingate_invoice_id"
    `);
  }
}
