import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnticipatoryActionAlertsTable1738249210356
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "anticipatory_action_alerts" (
        "id" SERIAL NOT NULL,
        "country" VARCHAR NOT NULL,
        "emails" VARCHAR[] NOT NULL,
        "prism_url" VARCHAR NOT NULL,
        "last_triggered_at" TIMESTAMPTZ,
        "last_ran_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "last_states" jsonb,
        CONSTRAINT "PK_ad91cad659a3536465d564a4b3a" PRIMARY KEY ("id")
      )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "anticipatory_action_alerts"`);
  }
}
