-- Khởi tạo bảng lịch sử migration riêng biệt cho từng schema:
-- auth."__EFMigrationsHistory" cho AuthService
-- business."__EFMigrationsHistory" cho BusinessService
-- Giúp các microservice hoàn toàn độc lập 100%, không dùng chung bảng lịch sử migration.

-- 1. Schema auth
CREATE TABLE IF NOT EXISTS auth."__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory_auth" PRIMARY KEY ("MigrationId")
);

INSERT INTO auth."__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261003144735_Initial_Auth_Schema', '8.0.11')
ON CONFLICT ("MigrationId") DO NOTHING;

-- 2. Schema business
CREATE TABLE IF NOT EXISTS business."__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory_business" PRIMARY KEY ("MigrationId")
);

INSERT INTO business."__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES 
    ('20261003144801_Initial_Business_Schema', '8.0.11'),
    ('20261003145455_AutoSync_20261003_215444', '8.0.11')
ON CONFLICT ("MigrationId") DO NOTHING;
