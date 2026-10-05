import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Tài khoản và refresh token (Step 5). Sinh bằng migration:generate, thêm index email. */
export class CreateUsersAndRefreshTokens1789482175602 implements MigrationInterface {
  name = 'CreateUsersAndRefreshTokens1789482175602';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(254) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "full_name" character varying(150) NOT NULL,
        "date_of_birth" date NOT NULL,
        "gender" character varying(10),
        "phone" character varying(30),
        "avatar_url" character varying(1024),
        "address" character varying(500),
        "locale" character varying(10) NOT NULL DEFAULT 'vi',
        "timezone" character varying(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
        "system_role" character varying(32) NOT NULL DEFAULT 'REGISTERED_USER',
        "status" character varying(16) NOT NULL DEFAULT 'active',
        "must_change_password" boolean NOT NULL DEFAULT false,
        "token_version" integer NOT NULL DEFAULT '0',
        "email_verified_at" TIMESTAMP WITH TIME ZONE,
        "last_login_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "CHK_users_status" CHECK ("status" IN ('active', 'locked')),
        CONSTRAINT "CHK_users_system_role" CHECK ("system_role" IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN', 'REGISTERED_USER')),
        CONSTRAINT "CHK_users_gender" CHECK ("gender" IS NULL OR "gender" IN ('male', 'female', 'other')),
        CONSTRAINT "CHK_users_email_lowercase" CHECK ("email" = lower("email")),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);
    // Email unique không phân biệt hoa thường, bỏ qua user đã xoá mềm (thay cho
    // citext để không phải tạo extension). Entity khai báo synchronize: false.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_email" ON "users" (lower("email")) WHERE "deleted_at" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" character(64) NOT NULL,
        "family_id" uuid NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "replaced_by_id" uuid,
        "user_agent" character varying(512),
        "ip" character varying(64),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_refresh_tokens_token_hash" ON "refresh_tokens" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_family_id" ON "refresh_tokens" ("family_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // DROP TABLE xoá luôn index và constraint của bảng.
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
