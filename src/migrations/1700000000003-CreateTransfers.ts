import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransfers1700000000003 implements MigrationInterface {
  name = 'CreateTransfers1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "transfers" (
        "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
        "currency"     VARCHAR       NOT NULL,
        "amount"       DECIMAL(18,8) NOT NULL,
        "tx_hash"      VARCHAR,
        "executed_at"  TIMESTAMP     NOT NULL,
        "created_at"   TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transfers" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_transfers_currency" ON "transfers" ("currency")`);
    await queryRunner.query(`CREATE INDEX "IDX_transfers_executed_at" ON "transfers" ("executed_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_transfers_executed_at"`);
    await queryRunner.query(`DROP INDEX "IDX_transfers_currency"`);
    await queryRunner.query(`DROP TABLE "transfers"`);
  }
}
