-- Khởi tạo bảng __EFMigrationsHistory cho PostgreSQL lang-simulator
-- Đánh dấu 2 migration ban đầu (Initial_Auth_Schema và Initial_Business_Schema) đã được áp dụng
-- Giúp EF Core nhận diện hiện trạng CSDL hiện tại và chỉ áp dụng các thay đổi mới (Incremental migrations).

CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES 
    ('20261003144735_Initial_Auth_Schema', '8.0.11'),
    ('20261003144801_Initial_Business_Schema', '8.0.11')
ON CONFLICT ("MigrationId") DO NOTHING;
