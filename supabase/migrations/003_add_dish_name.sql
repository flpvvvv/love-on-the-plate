-- Add dish_name column to photos table
ALTER TABLE photos ADD COLUMN IF NOT EXISTS dish_name TEXT;

-- Create index for dish name searches
CREATE INDEX IF NOT EXISTS idx_photos_dish_name ON photos(dish_name);
