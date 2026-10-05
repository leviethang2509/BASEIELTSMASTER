import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Thời khoá biểu, ngày nghỉ (req-3 Step 8, plan 4.6). Sinh bằng
 * migration:generate: ô lặp, buổi học (thường/bù), giáo viên riêng của buổi,
 * map buổi ↔ chương/mục giáo trình lớp, ngày nghỉ của trung tâm; tham số
 * chuyên cần của tenant; `classrooms.apply_tenant_holidays`.
 */
export class CreateClassSchedule1789836331338 implements MigrationInterface {
  name = 'CreateClassSchedule1789836331338';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tenant_holidays" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "name" character varying(200) NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_tenant_holidays_range" CHECK ("end_date" >= "start_date"), CONSTRAINT "PK_tenant_holidays" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_holidays_tenant_start" ON "tenant_holidays" ("tenant_id", "start_date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "class_sessions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "classroom_id" uuid NOT NULL, "kind" character varying(16) NOT NULL, "seq" integer, "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL, "time_overridden" boolean NOT NULL DEFAULT false, "location" character varying(500), "note" text, "status" character varying(16) NOT NULL DEFAULT 'scheduled', "cancel_reason" character varying(500), "makeup_for_session_id" uuid, "custom_teachers" boolean NOT NULL DEFAULT false, "moved_warning" boolean NOT NULL DEFAULT false, "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_class_sessions_time" CHECK ("ends_at" > "starts_at"), CONSTRAINT "CHK_class_sessions_seq" CHECK (("kind" = 'regular' AND "seq" >= 1) OR ("kind" = 'makeup' AND "seq" IS NULL)), CONSTRAINT "CHK_class_sessions_status" CHECK ("status" IN ('scheduled', 'cancelled')), CONSTRAINT "CHK_class_sessions_kind" CHECK ("kind" IN ('regular', 'makeup')), CONSTRAINT "PK_class_sessions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_sessions_makeup_for_session_id" ON "class_sessions" ("makeup_for_session_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_sessions_starts_at" ON "class_sessions" ("starts_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_class_sessions_classroom_seq" ON "class_sessions" ("classroom_id", "seq") `,
    );
    await queryRunner.query(
      `CREATE TABLE "class_session_teachers" ("session_id" uuid NOT NULL, "membership_id" uuid NOT NULL, CONSTRAINT "PK_class_session_teachers" PRIMARY KEY ("session_id", "membership_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_session_teachers_membership_id" ON "class_session_teachers" ("membership_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "class_session_links" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "session_id" uuid NOT NULL, "class_item_id" uuid, "class_group_id" uuid, CONSTRAINT "CHK_class_session_links_target" CHECK (("class_item_id" IS NULL) <> ("class_group_id" IS NULL)), CONSTRAINT "PK_class_session_links" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_session_links_class_item_id" ON "class_session_links" ("class_item_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_session_links_class_group_id" ON "class_session_links" ("class_group_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_class_session_links_group" ON "class_session_links" ("session_id", "class_group_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_class_session_links_item" ON "class_session_links" ("session_id", "class_item_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "class_schedule_slots" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "classroom_id" uuid NOT NULL, "weekday" smallint NOT NULL, "start_time" character varying(5) NOT NULL, "end_time" character varying(5) NOT NULL, CONSTRAINT "CHK_class_schedule_slots_time" CHECK ("start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "start_time" < "end_time"), CONSTRAINT "CHK_class_schedule_slots_weekday" CHECK ("weekday" BETWEEN 1 AND 7), CONSTRAINT "PK_class_schedule_slots" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_schedule_slots_classroom_id" ON "class_schedule_slots" ("classroom_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "late_weight" numeric(3,2) NOT NULL DEFAULT '0.5'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "warning_threshold" integer NOT NULL DEFAULT '70'`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" ADD "apply_tenant_holidays" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "CHK_tenants_warning_threshold" CHECK ("warning_threshold" >= 0 AND "warning_threshold" <= 100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "CHK_tenants_late_weight" CHECK ("late_weight" >= 0 AND "late_weight" <= 1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_holidays" ADD CONSTRAINT "FK_tenant_holidays_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_holidays" ADD CONSTRAINT "FK_tenant_holidays_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_sessions" ADD CONSTRAINT "FK_class_sessions_classroom_id" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_sessions" ADD CONSTRAINT "FK_class_sessions_makeup_for_session_id" FOREIGN KEY ("makeup_for_session_id") REFERENCES "class_sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_sessions" ADD CONSTRAINT "FK_class_sessions_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_session_teachers" ADD CONSTRAINT "FK_class_session_teachers_session_id" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_session_teachers" ADD CONSTRAINT "FK_class_session_teachers_membership_id" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_session_links" ADD CONSTRAINT "FK_class_session_links_session_id" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_session_links" ADD CONSTRAINT "FK_class_session_links_class_item_id" FOREIGN KEY ("class_item_id") REFERENCES "class_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_session_links" ADD CONSTRAINT "FK_class_session_links_class_group_id" FOREIGN KEY ("class_group_id") REFERENCES "class_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_schedule_slots" ADD CONSTRAINT "FK_class_schedule_slots_classroom_id" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "class_session_links"`);
    await queryRunner.query(`DROP TABLE "class_session_teachers"`);
    await queryRunner.query(`DROP TABLE "class_sessions"`);
    await queryRunner.query(`DROP TABLE "class_schedule_slots"`);
    await queryRunner.query(`DROP TABLE "tenant_holidays"`);
    await queryRunner.query(
      `ALTER TABLE "classrooms" DROP COLUMN "apply_tenant_holidays"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT "CHK_tenants_late_weight"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT "CHK_tenants_warning_threshold"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN "warning_threshold"`,
    );
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "late_weight"`);
  }
}
