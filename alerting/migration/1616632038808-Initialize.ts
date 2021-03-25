import {MigrationInterface, QueryRunner} from "typeorm";

export class Initialize1616632038808 implements MigrationInterface {
    name = 'Initialize1616632038808'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "alert" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "zone" geometry NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "last_triggered" TIMESTAMP NOT NULL, CONSTRAINT "UQ_4b76fa365c1e3c08cd5f325fad9" UNIQUE ("zone"), CONSTRAINT "PK_ad91cad659a3536465d564a4b2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4b76fa365c1e3c08cd5f325fad" ON "alert" USING GiST ("zone") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_4b76fa365c1e3c08cd5f325fad"`);
        await queryRunner.query(`DROP TABLE "alert"`);
    }

}
