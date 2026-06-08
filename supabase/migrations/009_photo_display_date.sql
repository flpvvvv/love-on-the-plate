-- 009: Add display_date for unified gallery ordering
--
-- The gallery orders photos by capture time (taken_at) but falls back to
-- upload time (created_at) when capture time is unknown. Doing that fallback
-- at query time required a fragile two-column sort (taken_at DESC NULLS LAST,
-- created_at DESC) plus a compound cursor, which silently dropped NULL-taken_at
-- rows from pagination and hid back-dated uploads.
--
-- Replace it with a single STORED generated column so ordering, keyset
-- pagination, and display all key off one always-present, indexable value.
-- created_at has DEFAULT NOW() and is never null, so display_date is never null.

-- 1. Effective display/order date: capture time, else upload time.
--    STORED generated columns are computed for every existing row at ADD COLUMN
--    time, so all current photos are backfilled automatically.
ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS display_date TIMESTAMPTZ
  GENERATED ALWAYS AS (COALESCE(taken_at, created_at)) STORED;

-- 2. Keyset-pagination index over the exact gallery sort order.
--    id (uuid PK) is the stable final tiebreaker for equal display_date values.
CREATE INDEX IF NOT EXISTS idx_photos_display_date
  ON photos (display_date DESC, id DESC);
