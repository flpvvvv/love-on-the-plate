-- 005: Performance and security fixes
--
-- Addresses:
--   1. Missing index on uploaded_by (used in RLS + FK cascade)
--   2. SECURITY DEFINER functions missing SET search_path
--   3. RLS policies calling auth.uid() per-row instead of once
--   4. Analytics aggregation pushed to SQL (was JS client-side)

-- ============================================================
-- 1. Add missing index on uploaded_by (FK to auth.users)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON photos (uploaded_by);

-- ============================================================
-- 2. Fix SECURITY DEFINER functions
--    - SET search_path = '' prevents search-path injection
--    - Wrap auth.uid() in SELECT for single evaluation
--    - Fully qualify table references
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================
-- 3. Fix RLS policies — wrap auth.uid() / is_admin() in SELECT
--    so Postgres evaluates them once per query, not per row.
-- ============================================================

-- photos: SELECT (public) — no change needed, already USING (true)

-- photos: INSERT
DROP POLICY IF EXISTS "Admins can insert photos" ON photos;
CREATE POLICY "Admins can insert photos"
    ON photos
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT is_admin()));

-- photos: UPDATE
DROP POLICY IF EXISTS "Owner or admin can update photos" ON photos;
CREATE POLICY "Owner or admin can update photos"
    ON photos
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = uploaded_by OR (SELECT is_admin()))
    WITH CHECK ((SELECT auth.uid()) = uploaded_by OR (SELECT is_admin()));

-- photos: DELETE
DROP POLICY IF EXISTS "Owner or admin can delete photos" ON photos;
CREATE POLICY "Owner or admin can delete photos"
    ON photos
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = uploaded_by OR (SELECT is_admin()));

-- user_profiles: SELECT
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile"
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = id);

-- ============================================================
-- 4. Analytics helper functions (push aggregation into SQL)
-- ============================================================
CREATE OR REPLACE FUNCTION get_monthly_photo_counts(since timestamptz)
RETURNS TABLE(month text, photo_count bigint) AS $$
    SELECT to_char(created_at, 'YYYY-MM'), count(*)
    FROM public.photos
    WHERE created_at >= since
    GROUP BY 1 ORDER BY 1;
$$ LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '';

CREATE OR REPLACE FUNCTION get_daily_photo_counts(since timestamptz)
RETURNS TABLE(day text, photo_count bigint) AS $$
    SELECT to_char(created_at, 'YYYY-MM-DD'), count(*)
    FROM public.photos
    WHERE created_at >= since
    GROUP BY 1 ORDER BY 1;
$$ LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '';

CREATE OR REPLACE FUNCTION get_top_dishes(lim int DEFAULT 8)
RETURNS TABLE(dish_name text, dish_count bigint) AS $$
    SELECT p.dish_name, count(*)
    FROM public.photos p
    WHERE p.dish_name IS NOT NULL AND p.dish_name != ''
    GROUP BY 1 ORDER BY 2 DESC LIMIT lim;
$$ LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '';
