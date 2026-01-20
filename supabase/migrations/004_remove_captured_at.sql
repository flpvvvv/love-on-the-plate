-- Remove captured_at column since we just use created_at for upload time
ALTER TABLE photos DROP COLUMN IF EXISTS captured_at;
