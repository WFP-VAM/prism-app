import {MigrationInterface, QueryRunner} from "typeorm";

export class Initialize1616633920780 implements MigrationInterface {
    name = 'Initialize1616633920780'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "alert" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "alert_name" character varying, "alert_config" json NOT NULL, "min" integer, "max" integer, "zones" geometry, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "last_triggered" TIMESTAMP, CONSTRAINT "UQ_b7fd6f37e68db1604ce671724fa" UNIQUE ("zones"), CONSTRAINT "PK_ad91cad659a3536465d564a4b2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b7fd6f37e68db1604ce671724f" ON "alert" USING GiST ("zones") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_b7fd6f37e68db1604ce671724f"`);
        await queryRunner.query(`DROP TABLE "alert"`);
    }

}
