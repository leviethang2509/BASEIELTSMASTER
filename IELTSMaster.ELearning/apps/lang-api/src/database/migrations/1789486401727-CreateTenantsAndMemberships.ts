import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gói dịch vụ, tenant, membership, role và liên kết phụ huynh (Step 6). Sinh
 * bằng migration:generate. FK kép (membership_id, tenant_id) bảo đảm role và
 * liên kết phụ huynh cùng tenant với membership.
 */
export class CreateTenantsAndMemberships1789486401727 implements MigrationInterface {
  name = 'CreateTenantsAndMemberships1789486401727';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "service_plans" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" character varying(32) NOT NULL,
        "name" character varying(100) NOT NULL,
        "max_members" integer NOT NULL,
        "price" numeric(12,2),
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT '0',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_service_plans_price" CHECK ("price" IS NULL OR "price" >= 0),
        CONSTRAINT "CHK_service_plans_max_members" CHECK ("max_members" > 0),
        CONSTRAINT "PK_service_plans" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_service_plans_code" ON "service_plans" ("code")`,
    );

    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(150) NOT NULL,
        "slug" character varying(40) NOT NULL,
        "logo_url" character varying(1024),
        "description" text,
        "email" character varying(254),
        "phone" character varying(30),
        "address" character varying(500),
        "status" character varying(16) NOT NULL DEFAULT 'pending',
        "rejection_reason" character varying(1000),
        "plan_id" uuid NOT NULL,
        "owner_user_id" uuid NOT NULL,
        "reviewed_by" uuid,
        "reviewed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "CHK_tenants_status" CHECK ("status" IN ('pending', 'active', 'rejected', 'suspended')),
        CONSTRAINT "CHK_tenants_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
        CONSTRAINT "PK_tenants" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tenants_plan_id" ON "tenants" ("plan_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenants_owner_user_id" ON "tenants" ("owner_user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_tenants_slug" ON "tenants" ("slug") WHERE "deleted_at" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "memberships" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'active',
        "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_memberships_id_tenant" UNIQUE ("id", "tenant_id"),
        CONSTRAINT "CHK_memberships_status" CHECK ("status" IN ('active', 'inactive')),
        CONSTRAINT "PK_memberships" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_memberships_user_id" ON "memberships" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_memberships_tenant_user" ON "memberships" ("tenant_id", "user_id") WHERE "deleted_at" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "student_guardians" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "student_membership_id" uuid NOT NULL,
        "parent_membership_id" uuid NOT NULL,
        "relationship" character varying(50),
        "created_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_student_guardians_student_parent" UNIQUE ("student_membership_id", "parent_membership_id"),
        CONSTRAINT "CHK_student_guardians_distinct" CHECK ("student_membership_id" <> "parent_membership_id"),
        CONSTRAINT "PK_student_guardians" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_student_guardians_parent_membership_id" ON "student_guardians" ("parent_membership_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "membership_roles" (
        "membership_id" uuid NOT NULL,
        "role" character varying(32) NOT NULL,
        "tenant_id" uuid NOT NULL,
        CONSTRAINT "CHK_membership_roles_role" CHECK ("role" IN ('TENANT_OWNER', 'TENANT_ADMIN', 'TEACHER', 'STUDENT', 'PARENT')),
        CONSTRAINT "PK_membership_roles" PRIMARY KEY ("membership_id", "role")
      )
    `);
    // Mỗi tenant đúng một Tenant Owner.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_membership_roles_tenant_owner" ON "membership_roles" ("tenant_id") WHERE "role" = 'TENANT_OWNER'`,
    );

    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "FK_tenants_plan_id" FOREIGN KEY ("plan_id") REFERENCES "service_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "FK_tenants_owner_user_id" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "FK_tenants_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "memberships" ADD CONSTRAINT "FK_memberships_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "memberships" ADD CONSTRAINT "FK_memberships_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "memberships" ADD CONSTRAINT "FK_memberships_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_guardians" ADD CONSTRAINT "FK_student_guardians_student" FOREIGN KEY ("student_membership_id", "tenant_id") REFERENCES "memberships"("id","tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_guardians" ADD CONSTRAINT "FK_student_guardians_parent" FOREIGN KEY ("parent_membership_id", "tenant_id") REFERENCES "memberships"("id","tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_guardians" ADD CONSTRAINT "FK_student_guardians_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "membership_roles" ADD CONSTRAINT "FK_membership_roles_membership" FOREIGN KEY ("membership_id", "tenant_id") REFERENCES "memberships"("id","tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // DROP TABLE xoá luôn index và constraint của bảng; bảng con xoá trước.
    await queryRunner.query(`DROP TABLE "membership_roles"`);
    await queryRunner.query(`DROP TABLE "student_guardians"`);
    await queryRunner.query(`DROP TABLE "memberships"`);
    await queryRunner.query(`DROP TABLE "tenants"`);
    await queryRunner.query(`DROP TABLE "service_plans"`);
  }
}
