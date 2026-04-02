import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsersAndOrderUserId1700000000007 implements MigrationInterface {
  name = 'AddUsersAndOrderUserId1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"            UUID      NOT NULL DEFAULT gen_random_uuid(),
        "name"          VARCHAR   NOT NULL,
        "email"         VARCHAR   NOT NULL,
        "password_hash" VARCHAR   NOT NULL,
        "created_at"    TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users"       PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN IF NOT EXISTS "user_id" UUID
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_orders_user'
        ) THEN
          ALTER TABLE "orders"
            ADD CONSTRAINT "FK_orders_user"
            FOREIGN KEY ("user_id") REFERENCES "users"("id");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_orders_user"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
