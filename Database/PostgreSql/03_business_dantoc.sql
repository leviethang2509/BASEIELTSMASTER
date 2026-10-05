-- IELTSMaster BusinessService - Danh muc Dan toc
-- Creates the table and PostgreSQL functions used by DanTocService.

CREATE SCHEMA IF NOT EXISTS business;

CREATE TABLE IF NOT EXISTS business.dm_dantoc (
    id uuid PRIMARY KEY,
    ten_goi varchar(255) NOT NULL,
    ghi_chu text NULL,
    mo_ta text NULL,
    thu_tu_uu_tien integer NULL,
    is_actived boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by varchar(255) NULL,
    updated_at timestamp with time zone NULL,
    updated_by varchar(255) NULL,
    is_deleted boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dm_dantoc_ten_goi_not_deleted
    ON business.dm_dantoc (lower(btrim(ten_goi)))
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS ix_dm_dantoc_is_deleted_sort
    ON business.dm_dantoc (is_deleted, thu_tu_uu_tien, ten_goi);

CREATE OR REPLACE FUNCTION business.fn_dantoc_get_list(
    i_text_search text DEFAULT '',
    i_page_index integer DEFAULT 1,
    i_rows_per_page integer DEFAULT 10
)
RETURNS TABLE (
    "Id" uuid,
    "TenGoi" text,
    "GhiChu" text,
    "MoTa" text,
    "ThuTuUuTien" integer,
    "CreatedAt" timestamp with time zone,
    "CreatedBy" text,
    "UpdatedAt" timestamp with time zone,
    "UpdatedBy" text,
    "IsActived" boolean,
    "IsEdit" boolean,
    "Sort" integer,
    "TotalRow" integer
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_text_search text := lower(btrim(coalesce(i_text_search, '')));
    v_page_index integer := greatest(coalesce(i_page_index, 1), 1);
    v_rows_per_page integer := greatest(coalesce(i_rows_per_page, 10), 1);
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT d.*
        FROM business.dm_dantoc d
        WHERE d.is_deleted = false
          AND (
              v_text_search = ''
              OR lower(d.ten_goi) LIKE '%' || v_text_search || '%'
              OR lower(coalesce(d.ghi_chu, '')) LIKE '%' || v_text_search || '%'
              OR lower(coalesce(d.mo_ta, '')) LIKE '%' || v_text_search || '%'
          )
    ),
    counted AS (
        SELECT f.*, count(*) OVER()::integer AS total_row
        FROM filtered f
        ORDER BY f.thu_tu_uu_tien NULLS LAST, f.ten_goi
        OFFSET (v_page_index - 1) * v_rows_per_page
        LIMIT v_rows_per_page
    )
    SELECT
        c.id AS "Id",
        c.ten_goi::text AS "TenGoi",
        c.ghi_chu AS "GhiChu",
        c.mo_ta AS "MoTa",
        c.thu_tu_uu_tien AS "ThuTuUuTien",
        c.created_at AS "CreatedAt",
        c.created_by::text AS "CreatedBy",
        c.updated_at AS "UpdatedAt",
        c.updated_by::text AS "UpdatedBy",
        c.is_actived AS "IsActived",
        true AS "IsEdit",
        c.thu_tu_uu_tien AS "Sort",
        c.total_row AS "TotalRow"
    FROM counted c;
END;
$$;

CREATE OR REPLACE FUNCTION business.fn_dantoc_get_all_combobox()
RETURNS TABLE (
    "Text" text,
    "Value" text,
    "Sort" integer,
    "Parent" text,
    "IsSelected" boolean
)
LANGUAGE sql
AS $$
    SELECT
        d.ten_goi::text AS "Text",
        d.id::text AS "Value",
        d.thu_tu_uu_tien AS "Sort",
        NULL::text AS "Parent",
        false AS "IsSelected"
    FROM business.dm_dantoc d
    WHERE d.is_deleted = false
      AND d.is_actived = true
    ORDER BY d.thu_tu_uu_tien NULLS LAST, d.ten_goi;
$$;
