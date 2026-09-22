/*
    Base IELTSMASTER system seed data.
    Default admin account:
      username: admin
      password: Admin@123
    Change this password after first login.
*/

USE [IELTSMASTER];
GO

DECLARE @user_role_id uniqueidentifier =
    COALESCE((SELECT TOP 1 id FROM dbo.[role] WHERE name = N'User'), CONVERT(uniqueidentifier, '11111111-1111-1111-1111-111111111111'));
DECLARE @admin_role_id uniqueidentifier =
    COALESCE((SELECT TOP 1 id FROM dbo.[role] WHERE name = N'Administrator'), CONVERT(uniqueidentifier, '22222222-2222-2222-2222-222222222222'));
DECLARE @system_group_id uniqueidentifier =
    COALESCE((SELECT TOP 1 id FROM dbo.system_group WHERE name = N'System Administration'), CONVERT(uniqueidentifier, '33333333-3333-3333-3333-333333333333'));
DECLARE @admin_user_id uniqueidentifier =
    COALESCE((SELECT TOP 1 id FROM dbo.[user] WHERE username = N'admin'), CONVERT(uniqueidentifier, '44444444-4444-4444-4444-444444444444'));

IF NOT EXISTS (SELECT 1 FROM dbo.[role] WHERE id = @user_role_id)
BEGIN
    INSERT INTO dbo.[role]
    (
        id,
        name,
        created_at,
        created_by,
        is_actived,
        is_deleted
    )
    VALUES
    (
        @user_role_id,
        N'User',
        CONVERT(datetime2, '2026-01-01T00:00:00'),
        N'Seed',
        1,
        0
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[role] WHERE id = @admin_role_id)
BEGIN
    INSERT INTO dbo.[role]
    (
        id,
        name,
        created_at,
        created_by,
        is_actived,
        is_deleted
    )
    VALUES
    (
        @admin_role_id,
        N'Administrator',
        CONVERT(datetime2, '2026-01-02T00:00:00'),
        N'Seed',
        1,
        0
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.system_group WHERE id = @system_group_id)
BEGIN
    INSERT INTO dbo.system_group
    (
        id,
        name,
        sort,
        parent_id,
        created_at,
        created_by,
        is_actived,
        is_deleted
    )
    VALUES
    (
        @system_group_id,
        N'System Administration',
        1,
        NULL,
        SYSUTCDATETIME(),
        N'Seed',
        1,
        0
    );
END;

DECLARE @menus TABLE
(
    id uniqueidentifier NOT NULL,
    controller nvarchar(255) NOT NULL,
    name nvarchar(255) NOT NULL,
    sort int NOT NULL,
    can_view bit NOT NULL,
    can_add bit NOT NULL,
    can_update bit NOT NULL,
    can_delete bit NOT NULL,
    can_approve bit NOT NULL,
    can_analyze bit NOT NULL,
    is_show_menu bit NOT NULL
);

INSERT INTO @menus
(
    id,
    controller,
    name,
    sort,
    can_view,
    can_add,
    can_update,
    can_delete,
    can_approve,
    can_analyze,
    is_show_menu
)
VALUES
    (CONVERT(uniqueidentifier, '55555555-5555-5555-5555-555555555551'), N'user', N'Accounts', 10, 1, 1, 1, 1, 1, 1, 1),
    (CONVERT(uniqueidentifier, '55555555-5555-5555-5555-555555555552'), N'role', N'Roles and Permissions', 20, 1, 1, 1, 1, 1, 1, 1),
    (CONVERT(uniqueidentifier, '55555555-5555-5555-5555-555555555553'), N'menu', N'Menus', 30, 1, 1, 1, 1, 1, 1, 1),
    (CONVERT(uniqueidentifier, '55555555-5555-5555-5555-555555555554'), N'systemgroup', N'System Groups', 40, 1, 1, 1, 1, 1, 1, 1),
    (CONVERT(uniqueidentifier, '55555555-5555-5555-5555-555555555555'), N'auditlog', N'Audit Logs', 50, 1, 0, 0, 0, 0, 0, 1);

MERGE dbo.menu AS target
USING @menus AS source
    ON target.controller = source.controller
WHEN MATCHED THEN
    UPDATE SET
        target.name = source.name,
        target.system_group_id = @system_group_id,
        target.sort = source.sort,
        target.can_view = source.can_view,
        target.can_add = source.can_add,
        target.can_update = source.can_update,
        target.can_delete = source.can_delete,
        target.can_approve = source.can_approve,
        target.can_analyze = source.can_analyze,
        target.is_show_menu = source.is_show_menu,
        target.is_actived = 1,
        target.is_deleted = 0,
        target.updated_at = SYSUTCDATETIME(),
        target.updated_by = N'Seed'
WHEN NOT MATCHED THEN
    INSERT
    (
        id,
        controller,
        name,
        system_group_id,
        sort,
        can_view,
        can_add,
        can_update,
        can_delete,
        can_approve,
        can_analyze,
        created_at,
        created_by,
        is_actived,
        is_deleted,
        is_show_menu
    )
    VALUES
    (
        source.id,
        source.controller,
        source.name,
        @system_group_id,
        source.sort,
        source.can_view,
        source.can_add,
        source.can_update,
        source.can_delete,
        source.can_approve,
        source.can_analyze,
        SYSUTCDATETIME(),
        N'Seed',
        1,
        0,
        source.is_show_menu
    );

IF NOT EXISTS (SELECT 1 FROM dbo.[user] WHERE id = @admin_user_id)
BEGIN
    INSERT INTO dbo.[user]
    (
        id,
        username,
        fullname,
        [password],
        password_salt,
        created_at,
        created_by,
        is_actived,
        is_deleted,
        role_id,
        email,
        avatar
    )
    VALUES
    (
        @admin_user_id,
        N'admin',
        N'Administrator',
        N'7uxCYXAPSQ6QVAouJ7EndwKFmSNbwwdMz2ed8ND9OB8=',
        N'IELTSMASTER_BASE_SALT_2026',
        SYSUTCDATETIME(),
        N'Seed',
        1,
        0,
        @admin_role_id,
        N'admin@ieltsmaster.local',
        N''
    );
END;

MERGE dbo.permission AS target
USING
(
    SELECT
        @admin_role_id AS role_id,
        m.id AS menu_id,
        m.can_view AS is_viewed,
        m.can_add AS is_added,
        m.can_update AS is_updated,
        m.can_delete AS is_deleted,
        m.can_approve AS is_approved,
        m.can_analyze AS is_analyzed
    FROM dbo.menu m
    INNER JOIN @menus seeded ON seeded.controller = m.controller
) AS source
    ON target.role_id = source.role_id
   AND target.menu_id = source.menu_id
WHEN MATCHED THEN
    UPDATE SET
        target.is_viewed = source.is_viewed,
        target.is_added = source.is_added,
        target.is_updated = source.is_updated,
        target.is_deleted = source.is_deleted,
        target.is_approved = source.is_approved,
        target.is_analyzed = source.is_analyzed
WHEN NOT MATCHED THEN
    INSERT
    (
        id,
        role_id,
        menu_id,
        is_viewed,
        is_added,
        is_updated,
        is_deleted,
        is_approved,
        is_analyzed
    )
    VALUES
    (
        NEWID(),
        source.role_id,
        source.menu_id,
        source.is_viewed,
        source.is_added,
        source.is_updated,
        source.is_deleted,
        source.is_approved,
        source.is_analyzed
    );
GO
