import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTypeToAnticipatoryActionAlerts1738850000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "anticipatory_action_alerts_type_enum" AS ENUM ('storm','flood','drought')`,
    );
    await queryRunner.query(
      `ALTER TABLE "anticipatory_action_alerts" ADD COLUMN "type" "anticipatory_action_alerts_type_enum" NOT NULL DEFAULT 'storm'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "anticipatory_action_alerts" DROP COLUMN "type"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "anticipatory_action_alerts_type_enum"`,
    );
  }
}
