import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLatestAaStormReportsTable1738249210356
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "latest_aa_storm_reports" (
        "id" SERIAL NOT NULL,
        "report_identifier" character varying NOT NULL,
        CONSTRAINT "PK_ad91cad659a3536465d564a4b3a" PRIMARY KEY ("id")
      )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "latest_aa_storm_reports"`);
  }
}
