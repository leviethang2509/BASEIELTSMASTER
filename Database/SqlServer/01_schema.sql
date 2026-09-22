/*
    IELTSMASTER base schema for SQL Server Express.
    Run this script before 02_stored_procedures.sql.
*/

IF DB_ID(N'IELTSMASTER') IS NULL
BEGIN
    CREATE DATABASE [IELTSMASTER];
END;
GO

USE [IELTSMASTER];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
GO

IF OBJECT_ID(N'dbo.[role]', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[role]
    (
        id uniqueidentifier NOT NULL
            CONSTRAINT role_pk PRIMARY KEY
            CONSTRAINT role_id_default DEFAULT NEWID(),
        name nvarchar(255) NOT NULL,
        created_at datetime2 NOT NULL
            CONSTRAINT role_created_at_default DEFAULT SYSUTCDATETIME(),
        created_by nvarchar(255) NOT NULL,
        updated_at datetime2 NULL,
        updated_by nvarchar(255) NULL,
        is_actived bit NOT NULL
            CONSTRAINT role_is_actived_default DEFAULT 1,
        is_deleted bit NOT NULL
            CONSTRAINT role_is_deleted_default DEFAULT 0
    );
END;
GO

IF OBJECT_ID(N'dbo.system_group', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.system_group
    (
        id uniqueidentifier NOT NULL
            CONSTRAINT system_group_pk PRIMARY KEY
            CONSTRAINT system_group_id_default DEFAULT NEWID(),
        name nvarchar(255) NOT NULL,
        sort int NOT NULL
            CONSTRAINT system_group_sort_default DEFAULT 0,
        parent_id uniqueidentifier NULL,
        created_at datetime2 NOT NULL
            CONSTRAINT system_group_created_at_default DEFAULT SYSUTCDATETIME(),
        created_by nvarchar(255) NOT NULL,
        updated_at datetime2 NULL,
        updated_by nvarchar(255) NULL,
        is_actived bit NOT NULL
            CONSTRAINT system_group_is_actived_default DEFAULT 1,
        is_deleted bit NOT NULL
            CONSTRAINT system_group_is_deleted_default DEFAULT 0,
        CONSTRAINT FK_SystemGroup_SystemGroup
            FOREIGN KEY (parent_id) REFERENCES dbo.system_group(id)
            ON DELETE NO ACTION
    );
END;
GO

IF OBJECT_ID(N'dbo.[user]', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[user]
    (
        id uniqueidentifier NOT NULL
            CONSTRAINT user_pk PRIMARY KEY
            CONSTRAINT user_id_default DEFAULT NEWID(),
        username nvarchar(255) NOT NULL,
        fullname nvarchar(255) NOT NULL,
        [password] nvarchar(500) NOT NULL,
        password_salt nvarchar(500) NOT NULL,
        created_at datetime2 NOT NULL
            CONSTRAINT user_created_at_default DEFAULT SYSUTCDATETIME(),
        created_by nvarchar(255) NOT NULL,
        updated_at datetime2 NULL,
        updated_by nvarchar(255) NULL,
        is_actived bit NOT NULL
            CONSTRAINT user_is_actived_default DEFAULT 1,
        is_deleted bit NOT NULL
            CONSTRAINT user_is_deleted_default DEFAULT 0,
        role_id uniqueidentifier NOT NULL,
        email nvarchar(255) NOT NULL,
        avatar nvarchar(max) NULL,
        CONSTRAINT FK_user_role
            FOREIGN KEY (role_id) REFERENCES dbo.[role](id)
    );
END;
GO

IF OBJECT_ID(N'dbo.menu', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.menu
    (
        id uniqueidentifier NOT NULL
            CONSTRAINT menu_pk PRIMARY KEY
            CONSTRAINT menu_id_default DEFAULT NEWID(),
        controller nvarchar(255) NOT NULL,
        name nvarchar(255) NOT NULL,
        system_group_id uniqueidentifier NOT NULL,
        sort int NOT NULL
            CONSTRAINT menu_sort_default DEFAULT 0,
        can_view bit NOT NULL
            CONSTRAINT menu_can_view_default DEFAULT 0,
        can_add bit NOT NULL
            CONSTRAINT menu_can_add_default DEFAULT 0,
        can_update bit NOT NULL
            CONSTRAINT menu_can_update_default DEFAULT 0,
        can_delete bit NOT NULL
            CONSTRAINT menu_can_delete_default DEFAULT 0,
        can_approve bit NOT NULL
            CONSTRAINT menu_can_approve_default DEFAULT 0,
        can_analyze bit NOT NULL
            CONSTRAINT menu_can_analyze_default DEFAULT 0,
        created_at datetime2 NOT NULL
            CONSTRAINT menu_created_at_default DEFAULT SYSUTCDATETIME(),
        created_by nvarchar(255) NOT NULL,
        updated_at datetime2 NULL,
        updated_by nvarchar(255) NULL,
        is_actived bit NOT NULL
            CONSTRAINT menu_is_actived_default DEFAULT 1,
        is_deleted bit NOT NULL
            CONSTRAINT menu_is_deleted_default DEFAULT 0,
        is_show_menu bit NOT NULL
            CONSTRAINT menu_is_show_menu_default DEFAULT 1,
        CONSTRAINT menu_system_group_id_fk
            FOREIGN KEY (system_group_id) REFERENCES dbo.system_group(id)
    );
END;
GO

IF OBJECT_ID(N'dbo.permission', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.permission
    (
        id uniqueidentifier NOT NULL
            CONSTRAINT permission_pk PRIMARY KEY
            CONSTRAINT permission_id_default DEFAULT NEWID(),
        role_id uniqueidentifier NOT NULL,
        menu_id uniqueidentifier NOT NULL,
        is_viewed bit NOT NULL
            CONSTRAINT permission_is_viewed_default DEFAULT 0,
        is_added bit NOT NULL
            CONSTRAINT permission_is_added_default DEFAULT 0,
        is_updated bit NOT NULL
            CONSTRAINT permission_is_updated_default DEFAULT 0,
        is_deleted bit NOT NULL
            CONSTRAINT permission_is_deleted_default DEFAULT 0,
        is_approved bit NOT NULL
            CONSTRAINT permission_is_approved_default DEFAULT 0,
        is_analyzed bit NOT NULL
            CONSTRAINT permission_is_analyzed_default DEFAULT 0,
        CONSTRAINT FK_permission_menu
            FOREIGN KEY (menu_id) REFERENCES dbo.menu(id),
        CONSTRAINT FK_permission_role
            FOREIGN KEY (role_id) REFERENCES dbo.[role](id)
    );
END;
GO

IF OBJECT_ID(N'dbo.refresh_token', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.refresh_token
    (
        id uniqueidentifier NOT NULL
            CONSTRAINT refresh_token_pk PRIMARY KEY
            CONSTRAINT refresh_token_id_default DEFAULT NEWID(),
        user_id uniqueidentifier NOT NULL,
        token nvarchar(max) NOT NULL,
        expires_at datetime2 NOT NULL,
        created_at datetime2 NOT NULL,
        created_by_ip nvarchar(255) NOT NULL,
        revoked_at datetime2 NULL,
        revoked_by_ip nvarchar(255) NULL,
        replaced_by_token nvarchar(max) NULL,
        reason_revoked nvarchar(max) NULL,
        CONSTRAINT refresh_token_user_id_fk
            FOREIGN KEY (user_id) REFERENCES dbo.[user](id)
    );
END;
GO

IF OBJECT_ID(N'dbo.audit_log', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.audit_log
    (
        id uniqueidentifier NOT NULL
            CONSTRAINT audit_log_pkey PRIMARY KEY
            CONSTRAINT audit_log_id_default DEFAULT NEWID(),
        user_id uniqueidentifier NOT NULL,
        user_name nvarchar(255) NOT NULL
            CONSTRAINT audit_log_user_name_default DEFAULT N'',
        action nvarchar(100) NOT NULL
            CONSTRAINT audit_log_action_default DEFAULT N'',
        entity_name nvarchar(255) NOT NULL
            CONSTRAINT audit_log_entity_name_default DEFAULT N'',
        entity_id nvarchar(255) NULL,
        old_values nvarchar(max) NULL,
        new_values nvarchar(max) NULL,
        ip_address nvarchar(50) NULL,
        service_name nvarchar(100) NULL,
        is_success bit NOT NULL
            CONSTRAINT audit_log_is_success_default DEFAULT 1,
        error_message nvarchar(max) NULL,
        created_at datetime2 NOT NULL
            CONSTRAINT audit_log_created_at_default DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_AuditLog_User
            FOREIGN KEY (user_id) REFERENCES dbo.[user](id)
    );
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'permission_role_menu_unique'
      AND object_id = OBJECT_ID(N'dbo.permission')
)
BEGIN
    CREATE UNIQUE INDEX permission_role_menu_unique
        ON dbo.permission(role_id, menu_id);
END;
GO

IF EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'ux_user_username'
      AND object_id = OBJECT_ID(N'dbo.[user]')
)
BEGIN
    DROP INDEX ux_user_username ON dbo.[user];
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'ix_user_username'
      AND object_id = OBJECT_ID(N'dbo.[user]')
)
BEGIN
    CREATE INDEX ix_user_username
        ON dbo.[user](username);
END;
GO

IF EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'ux_user_email'
      AND object_id = OBJECT_ID(N'dbo.[user]')
)
BEGIN
    DROP INDEX ux_user_email ON dbo.[user];
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'ix_user_email'
      AND object_id = OBJECT_ID(N'dbo.[user]')
)
BEGIN
    CREATE INDEX ix_user_email
        ON dbo.[user](email);
END;
GO
