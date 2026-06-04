-- 007: Ingredients tags
--
-- Adds:
--   1. ingredients text[] column to photos
--   2. GIN index for array queries (suggestions, analytics)
--   3. get_top_ingredients() analytics function

-- ============================================================
-- 1. Add ingredients column (Postgres text array)
-- ============================================================
ALTER TABLE photos ADD COLUMN IF NOT EXISTS ingredients text[] NOT NULL DEFAULT '{}';

-- ============================================================
-- 2. GIN index for efficient array operations
--    (unnest, ANY, containment queries for tag suggestions)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_photos_ingredients ON photos USING GIN (ingredients);

-- ============================================================
-- 3. Analytics: top ingredients (unnest + group + count)
-- ============================================================
CREATE OR REPLACE FUNCTION get_top_ingredients(lim int DEFAULT 8)
RETURNS TABLE(ingredient_name text, ingredient_count bigint) AS $$
    SELECT ingredient, count(*)
    FROM public.photos, unnest(ingredients) AS ingredient
    WHERE array_length(ingredients, 1) > 0
    GROUP BY 1 ORDER BY 2 DESC LIMIT lim;
$$ LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '';
