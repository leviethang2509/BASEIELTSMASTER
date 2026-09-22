/*
    IELTSMASTER stored procedures used by PDCA.SystemService.
    Each procedure returns one scalar JSON column because the application
    deserializes the first result returned by ExecuteScalarAsync().
*/

USE [IELTSMASTER];
GO

CREATE OR ALTER PROCEDURE dbo.sp_role_getlistpaging
    @i_textsearch nvarchar(255) = NULL,
    @i_pageindex int = 0,
    @i_pagesize int = 10
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @search nvarchar(255) = NULLIF(LTRIM(RTRIM(@i_textsearch)), N'');
    DECLARE @page_index int = CASE WHEN ISNULL(@i_pageindex, 0) < 0 THEN 0 ELSE ISNULL(@i_pageindex, 0) END;
    DECLARE @page_size int = CASE WHEN ISNULL(@i_pagesize, 10) <= 0 THEN 10 ELSE @i_pagesize END;
    DECLARE @total_row int =
    (
        SELECT COUNT(*)
        FROM dbo.[role] r
        WHERE r.is_deleted = 0
          AND (@search IS NULL OR r.name LIKE N'%' + @search + N'%')
    );
    DECLARE @json nvarchar(max);

    SELECT @json =
    (
        SELECT
            @page_index + 1 AS page_index,
            @page_size AS page_size,
            @total_row AS total_row,
            JSON_QUERY(COALESCE
            (
                (
                    SELECT
                        r.id,
                        r.name,
                        r.created_at,
                        r.created_by,
                        r.updated_at,
                        r.updated_by,
                        r.is_actived,
                        CAST(0 AS bit) AS is_edit
                    FROM dbo.[role] r
                    WHERE r.is_deleted = 0
                      AND (@search IS NULL OR r.name LIKE N'%' + @search + N'%')
                    ORDER BY r.name, r.id
                    OFFSET @page_index * @page_size ROWS
                    FETCH NEXT @page_size ROWS ONLY
                    FOR JSON PATH, INCLUDE_NULL_VALUES
                ),
                N'[]'
            )) AS data
        FOR JSON PATH, INCLUDE_NULL_VALUES, WITHOUT_ARRAY_WRAPPER
    );

    SELECT @json AS [result];
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_system_group_getlistpaging
    @i_textsearch nvarchar(255) = NULL,
    @i_pageindex int = 0,
    @i_pagesize int = 10
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @search nvarchar(255) = NULLIF(LTRIM(RTRIM(@i_textsearch)), N'');
    DECLARE @total_row int =
    (
        SELECT COUNT(*)
        FROM dbo.system_group sg
        WHERE sg.is_deleted = 0
          AND (@search IS NULL OR sg.name LIKE N'%' + @search + N'%')
    );
    DECLARE @json nvarchar(max);

    IF ISNULL(@i_pageindex, 0) = -1
    BEGIN
        SELECT @json =
        (
            SELECT
                -1 AS page_index,
                ISNULL(@i_pagesize, 0) AS page_size,
                @total_row AS total_row,
                JSON_QUERY(COALESCE
                (
                    (
                        SELECT
                            sg.id,
                            sg.name,
                            sg.sort,
                            sg.parent_id,
                            parent_group.name AS parent,
                            sg.created_at,
                            sg.created_by,
                            sg.updated_at,
                            sg.updated_by,
                            sg.is_actived,
                            CAST(0 AS bit) AS is_edit
                        FROM dbo.system_group sg
                        LEFT JOIN dbo.system_group parent_group
                            ON parent_group.id = sg.parent_id
                        WHERE sg.is_deleted = 0
                          AND (@search IS NULL OR sg.name LIKE N'%' + @search + N'%')
                        ORDER BY sg.sort, sg.name, sg.id
                        FOR JSON PATH, INCLUDE_NULL_VALUES
                    ),
                    N'[]'
                )) AS data
            FOR JSON PATH, INCLUDE_NULL_VALUES, WITHOUT_ARRAY_WRAPPER
        );

        SELECT @json AS [result];
        RETURN;
    END;

    DECLARE @page_index int = CASE WHEN ISNULL(@i_pageindex, 0) < 0 THEN 0 ELSE ISNULL(@i_pageindex, 0) END;
    DECLARE @page_size int = CASE WHEN ISNULL(@i_pagesize, 10) <= 0 THEN 10 ELSE @i_pagesize END;

    SELECT @json =
    (
        SELECT
            @page_index + 1 AS page_index,
            @page_size AS page_size,
            @total_row AS total_row,
            JSON_QUERY(COALESCE
            (
                (
                    SELECT
                        sg.id,
                        sg.name,
                        sg.sort,
                        sg.parent_id,
                        parent_group.name AS parent,
                        sg.created_at,
                        sg.created_by,
                        sg.updated_at,
                        sg.updated_by,
                        sg.is_actived,
                        CAST(0 AS bit) AS is_edit
                    FROM dbo.system_group sg
                    LEFT JOIN dbo.system_group parent_group
                        ON parent_group.id = sg.parent_id
                    WHERE sg.is_deleted = 0
                      AND (@search IS NULL OR sg.name LIKE N'%' + @search + N'%')
                    ORDER BY sg.sort, sg.name, sg.id
                    OFFSET @page_index * @page_size ROWS
                    FETCH NEXT @page_size ROWS ONLY
                    FOR JSON PATH, INCLUDE_NULL_VALUES
                ),
                N'[]'
            )) AS data
        FOR JSON PATH, INCLUDE_NULL_VALUES, WITHOUT_ARRAY_WRAPPER
    );

    SELECT @json AS [result];
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_menu_getlistpaging
    @i_textsearch nvarchar(255) = NULL,
    @i_pageindex int = 0,
    @i_pagesize int = 10
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @search nvarchar(255) = NULLIF(LTRIM(RTRIM(@i_textsearch)), N'');
    DECLARE @page_index int = CASE WHEN ISNULL(@i_pageindex, 0) < 0 THEN 0 ELSE ISNULL(@i_pageindex, 0) END;
    DECLARE @page_size int = CASE WHEN ISNULL(@i_pagesize, 10) <= 0 THEN 10 ELSE @i_pagesize END;
    DECLARE @total_row int =
    (
        SELECT COUNT(*)
        FROM dbo.menu m
        INNER JOIN dbo.system_group sg ON sg.id = m.system_group_id
        WHERE m.is_deleted = 0
          AND sg.is_deleted = 0
          AND (@search IS NULL
               OR m.name LIKE N'%' + @search + N'%'
               OR m.controller LIKE N'%' + @search + N'%'
               OR sg.name LIKE N'%' + @search + N'%')
    );
    DECLARE @json nvarchar(max);

    SELECT @json =
    (
        SELECT
            @page_index + 1 AS page_index,
            @page_size AS page_size,
            @total_row AS total_row,
            JSON_QUERY(COALESCE
            (
                (
                    SELECT
                        m.id,
                        m.controller,
                        m.name,
                        m.system_group_id,
                        m.sort,
                        m.can_view,
                        m.can_add,
                        m.can_update,
                        m.can_delete,
                        m.can_approve,
                        m.can_analyze,
                        m.created_at,
                        m.created_by,
                        m.updated_at,
                        m.updated_by,
                        m.is_actived,
                        m.is_show_menu,
                        sg.name AS system_group,
                        CAST(0 AS bit) AS is_edit
                    FROM dbo.menu m
                    INNER JOIN dbo.system_group sg ON sg.id = m.system_group_id
                    WHERE m.is_deleted = 0
                      AND sg.is_deleted = 0
                      AND (@search IS NULL
                           OR m.name LIKE N'%' + @search + N'%'
                           OR m.controller LIKE N'%' + @search + N'%'
                           OR sg.name LIKE N'%' + @search + N'%')
                    ORDER BY sg.sort, m.sort, m.name, m.id
                    OFFSET @page_index * @page_size ROWS
                    FETCH NEXT @page_size ROWS ONLY
                    FOR JSON PATH, INCLUDE_NULL_VALUES
                ),
                N'[]'
            )) AS data
        FOR JSON PATH, INCLUDE_NULL_VALUES, WITHOUT_ARRAY_WRAPPER
    );

    SELECT @json AS [result];
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_menu_getbyuser
    @i_user_id uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @json nvarchar(max);

    SELECT @json = COALESCE
    (
        (
            SELECT
                m.id,
                m.controller,
                m.name,
                m.system_group_id,
                m.sort,
                m.can_view,
                m.can_add,
                m.can_update,
                m.can_delete,
                m.can_approve,
                m.can_analyze,
                m.created_at,
                m.created_by,
                m.updated_at,
                m.updated_by,
                m.is_actived,
                m.is_show_menu,
                sg.name AS system_group,
                CAST(0 AS bit) AS is_edit
            FROM dbo.[user] u
            INNER JOIN dbo.permission p ON p.role_id = u.role_id AND p.is_viewed = 1
            INNER JOIN dbo.menu m ON m.id = p.menu_id
            INNER JOIN dbo.system_group sg ON sg.id = m.system_group_id
            WHERE u.id = @i_user_id
              AND u.is_deleted = 0
              AND u.is_actived = 1
              AND m.is_deleted = 0
              AND m.is_actived = 1
              AND m.is_show_menu = 1
              AND sg.is_deleted = 0
              AND sg.is_actived = 1
            ORDER BY sg.sort, m.sort, m.name, m.id
            FOR JSON PATH, INCLUDE_NULL_VALUES
        ),
        N'[]'
    );

    SELECT @json AS [result];
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_permission_getbyrole
    @i_role_id uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @json nvarchar(max);

    SELECT @json = COALESCE
    (
        (
            SELECT
                sg.name AS system_group,
                JSON_QUERY(COALESCE
                (
                    (
                        SELECT
                            COALESCE(p.id, CONVERT(uniqueidentifier, '00000000-0000-0000-0000-000000000000')) AS id,
                            @i_role_id AS role_id,
                            m.id AS menu_id,
                            m.name,
                            ISNULL(p.is_viewed, 0) AS is_viewed,
                            ISNULL(p.is_added, 0) AS is_added,
                            ISNULL(p.is_updated, 0) AS is_updated,
                            ISNULL(p.is_deleted, 0) AS is_deleted,
                            ISNULL(p.is_approved, 0) AS is_approved,
                            ISNULL(p.is_analyzed, 0) AS is_analyzed,
                            m.can_view,
                            m.can_add,
                            m.can_update,
                            m.can_delete,
                            m.can_approve,
                            m.can_analyze
                        FROM dbo.menu m
                        LEFT JOIN dbo.permission p
                            ON p.menu_id = m.id
                           AND p.role_id = @i_role_id
                        WHERE m.system_group_id = sg.id
                          AND m.is_deleted = 0
                        ORDER BY m.sort, m.name, m.id
                        FOR JSON PATH, INCLUDE_NULL_VALUES
                    ),
                    N'[]'
                )) AS roles
            FROM dbo.system_group sg
            WHERE sg.is_deleted = 0
            ORDER BY sg.sort, sg.name, sg.id
            FOR JSON PATH, INCLUDE_NULL_VALUES
        ),
        N'[]'
    );

    SELECT @json AS [result];
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_permission_getbyuser
    @i_user_id uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @json nvarchar(max);

    SELECT @json = COALESCE
    (
        (
            SELECT
                m.controller,
                ISNULL(p.is_viewed, 0) AS is_viewed,
                ISNULL(p.is_added, 0) AS is_added,
                ISNULL(p.is_updated, 0) AS is_updated,
                ISNULL(p.is_deleted, 0) AS is_deleted,
                ISNULL(p.is_approved, 0) AS is_approved,
                ISNULL(p.is_analyzed, 0) AS is_analyzed
            FROM dbo.[user] u
            INNER JOIN dbo.menu m ON m.is_deleted = 0
            LEFT JOIN dbo.permission p
                ON p.menu_id = m.id
               AND p.role_id = u.role_id
            WHERE u.id = @i_user_id
              AND u.is_deleted = 0
              AND u.is_actived = 1
            ORDER BY m.controller, m.id
            FOR JSON PATH, INCLUDE_NULL_VALUES
        ),
        N'[]'
    );

    SELECT @json AS [result];
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_user_getlistpaging
    @i_textsearch nvarchar(255) = NULL,
    @i_pageindex int = 0,
    @i_pagesize int = 10
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @search nvarchar(255) = NULLIF(LTRIM(RTRIM(@i_textsearch)), N'');
    DECLARE @page_index int = CASE WHEN ISNULL(@i_pageindex, 0) < 0 THEN 0 ELSE ISNULL(@i_pageindex, 0) END;
    DECLARE @page_size int = CASE WHEN ISNULL(@i_pagesize, 10) <= 0 THEN 10 ELSE @i_pagesize END;
    DECLARE @total_row int =
    (
        SELECT COUNT(*)
        FROM dbo.[user] u
        LEFT JOIN dbo.[role] r ON r.id = u.role_id
        WHERE u.is_deleted = 0
          AND (@search IS NULL
               OR u.username LIKE N'%' + @search + N'%'
               OR u.fullname LIKE N'%' + @search + N'%'
               OR u.email LIKE N'%' + @search + N'%'
               OR r.name LIKE N'%' + @search + N'%')
    );
    DECLARE @json nvarchar(max);

    SELECT @json =
    (
        SELECT
            @page_index + 1 AS page_index,
            @page_size AS page_size,
            @total_row AS total_row,
            JSON_QUERY(COALESCE
            (
                (
                    SELECT
                        u.id,
                        u.username,
                        u.fullname,
                        u.role_id,
                        r.name AS role,
                        u.email,
                        u.avatar,
                        u.created_at,
                        u.created_by,
                        u.updated_at,
                        u.updated_by,
                        u.is_actived,
                        CAST(0 AS bit) AS is_edit
                    FROM dbo.[user] u
                    LEFT JOIN dbo.[role] r ON r.id = u.role_id
                    WHERE u.is_deleted = 0
                      AND (@search IS NULL
                           OR u.username LIKE N'%' + @search + N'%'
                           OR u.fullname LIKE N'%' + @search + N'%'
                           OR u.email LIKE N'%' + @search + N'%'
                           OR r.name LIKE N'%' + @search + N'%')
                    ORDER BY u.username, u.id
                    OFFSET @page_index * @page_size ROWS
                    FETCH NEXT @page_size ROWS ONLY
                    FOR JSON PATH, INCLUDE_NULL_VALUES
                ),
                N'[]'
            )) AS data
        FOR JSON PATH, INCLUDE_NULL_VALUES, WITHOUT_ARRAY_WRAPPER
    );

    SELECT @json AS [result];
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_user_checkpermission
    @i_user_id uniqueidentifier,
    @i_controller nvarchar(255),
    @i_action int
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @has_permission bit = 0;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.[user] u
        INNER JOIN dbo.permission p ON p.role_id = u.role_id
        INNER JOIN dbo.menu m ON m.id = p.menu_id
        WHERE u.id = @i_user_id
          AND u.is_deleted = 0
          AND u.is_actived = 1
          AND m.is_deleted = 0
          AND m.is_actived = 1
          AND LOWER(m.controller) = LOWER(@i_controller)
          AND
          (
                (@i_action = 1 AND p.is_viewed = 1)
             OR (@i_action = 2 AND p.is_added = 1)
             OR (@i_action = 3 AND p.is_updated = 1)
             OR (@i_action = 4 AND p.is_deleted = 1)
             OR (@i_action = 5 AND p.is_approved = 1)
             OR (@i_action = 6 AND p.is_analyzed = 1)
          )
    )
    BEGIN
        SET @has_permission = 1;
    END;

    SELECT
    (
        SELECT @has_permission AS has_permission
        FOR JSON PATH, INCLUDE_NULL_VALUES, WITHOUT_ARRAY_WRAPPER
    ) AS [result];
END;
GO
