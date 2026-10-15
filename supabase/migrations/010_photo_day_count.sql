-- 010: Days recorded (how many distinct days hold at least one dish)
--
-- "Days recorded" is keyed on display_date (COALESCE(taken_at, created_at)) —
-- the same canonical date the gallery sorts and groups by — so a back-dated
-- photo counts for the day it was cooked, not the day it was uploaded.
--
-- The count has to happen in SQL: the day-grouped RPCs return one row per day
-- and PostgREST caps responses at db-max-rows (1000), so counting rows in JS
-- would silently stop growing after ~2.7 years of daily use.

-- ============================================================
-- Analytics: distinct recorded days
-- ============================================================
CREATE OR REPLACE FUNCTION get_photo_day_count()
RETURNS bigint AS $$
    SELECT count(DISTINCT display_date::date)
    FROM public.photos;
$$ LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '';
