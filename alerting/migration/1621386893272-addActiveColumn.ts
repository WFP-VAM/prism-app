import { MigrationInterface, QueryRunner } from 'typeorm';

export class addActiveColumn1621386893272 implements MigrationInterface {
  name = 'addActiveColumn1621386893272';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "alert" ADD "active" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert" DROP COLUMN "active"`);
  }
}
