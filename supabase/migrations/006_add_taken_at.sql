-- Add taken_at column for photo capture time from EXIF metadata
ALTER TABLE photos ADD COLUMN IF NOT EXISTS taken_at TIMESTAMPTZ;

-- Create composite index for efficient chronological queries
-- Allows sorting by taken_at (fallback to created_at) efficiently
CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos(taken_at DESC NULLS LAST, created_at DESC);