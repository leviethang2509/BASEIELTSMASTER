-- =============================================================================
-- IELTSMASTER - POSTGRESQL SCHEMA SEPARATION IN DATABASE 'lang-simulator'
-- 1. Schema 'auth'     : Dành riêng cho AuthService (users, tenants, memberships, tokens)
-- 2. Schema 'business' : Dành riêng cho BusinessService (classrooms, courses, exams, lessons)
-- 3. Schema 'public'   : Chứa Views tương thích ngược cho NestJS / Next.js
-- =============================================================================

-- 1. Tạo các schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS business;

-- 2. Chuyển các bảng xác thực sang schema [auth]
DO $$
DECLARE
    tbl text;
    auth_tables text[] := ARRAY[
        'users',
        'tenants',
        'service_plans',
        'memberships',
        'membership_roles',
        'refresh_tokens'
    ];
BEGIN
    FOREACH tbl IN ARRAY auth_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I SET SCHEMA auth;', tbl);
            RAISE NOTICE 'Đã chuyển bảng public.% sang auth.%', tbl, tbl;
        END IF;

        -- Tạo view trong public để tương thích ngược 100% với TypeORM/NestJS cũ
        IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = tbl) 
           AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('CREATE OR REPLACE VIEW public.%I AS SELECT * FROM auth.%I;', tbl, tbl);
            RAISE NOTICE 'Đã tạo view tương thích ngược public.% -> auth.%', tbl, tbl;
        END IF;
    END LOOP;
END $$;

-- 3. Chuyển các bảng nghiệp vụ đào tạo sang schema [business]
DO $$
DECLARE
    tbl text;
    business_tables text[] := ARRAY[
        'classrooms',
        'classroom_students',
        'classroom_teachers',
        'class_sessions',
        'class_session_links',
        'class_session_teachers',
        'class_items',
        'class_groups',
        'class_schedule_slots',
        'class_change_logs',
        'courses',
        'course_curricula',
        'curricula',
        'curriculum_groups',
        'curriculum_items',
        'categories',
        'lessons',
        'lesson_modules',
        'lesson_parts',
        'lesson_sections',
        'lesson_questions',
        'lesson_blueprints',
        'lesson_attempts',
        'lesson_attempt_answers',
        'lesson_attempt_sections',
        'exams',
        'exam_modules',
        'exam_parts',
        'exam_sections',
        'exam_questions',
        'exam_blueprints',
        'exam_attempts',
        'exam_attempt_answers',
        'exam_attempt_sections',
        'grading_delegations',
        'student_guardians',
        'tenant_holidays',
        'notifications',
        'ai_format_runs'
    ];
BEGIN
    FOREACH tbl IN ARRAY business_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I SET SCHEMA business;', tbl);
            RAISE NOTICE 'Đã chuyển bảng public.% sang business.%', tbl, tbl;
        END IF;

        -- Tạo view trong public để tương thích ngược 100%
        IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = tbl) 
           AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('CREATE OR REPLACE VIEW public.%I AS SELECT * FROM business.%I;', tbl, tbl);
            RAISE NOTICE 'Đã tạo view tương thích ngược public.% -> business.%', tbl, tbl;
        END IF;
    END LOOP;
END $$;

-- Cấp quyền cho user lang_simulator
GRANT ALL ON SCHEMA auth TO lang_simulator;
GRANT ALL ON SCHEMA business TO lang_simulator;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO lang_simulator;
GRANT ALL ON ALL TABLES IN SCHEMA business TO lang_simulator;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO lang_simulator;
GRANT ALL ON ALL SEQUENCES IN SCHEMA business TO lang_simulator;
