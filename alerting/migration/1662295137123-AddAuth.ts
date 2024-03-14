import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuth1662295137123 implements MigrationInterface {
  name = 'AddAuth1662295137123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_info" (
          "id" SERIAL NOT NULL,
          "username" character varying PRIMARY KEY,
          "password" character varying NOT NULL,
          "salt" character varying,
          "access" jsonb,
          "deployment" character varying,
          "organization" character varying,
          "email" character varying,
          "details" character varying,
          "created_at" TIMESTAMP NOT NULL DEFAULT now()
        )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_info"`);
  }
}
