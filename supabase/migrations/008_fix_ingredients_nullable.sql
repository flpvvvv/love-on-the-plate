-- 008: Allow NULL ingredients for backfill detection
--
-- 007 added ingredients with NOT NULL DEFAULT '{}', which means
-- existing rows got empty arrays instead of NULL. The backfill
-- query checks for NULL to detect photos needing ingredient tags.
-- This migration makes ingredients nullable so existing rows
-- without real ingredient data can be detected.

-- 1. Remove NOT NULL constraint (allows NULL for backfill detection)
ALTER TABLE photos ALTER COLUMN ingredients DROP NOT NULL;

-- 2. Set empty ingredient arrays to NULL so backfill can find them
UPDATE photos SET ingredients = NULL WHERE array_length(ingredients, 1) IS NULL;
