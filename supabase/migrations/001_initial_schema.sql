-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Photos table
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT NOT NULL,
    description_en TEXT,
    description_cn TEXT,
    original_filename TEXT,
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    captured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index for fast chronological queries (cursor-based pagination)
CREATE INDEX idx_photos_created_at ON photos(created_at DESC);

-- Enable Row Level Security
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view photos (public gallery)
CREATE POLICY "Public can view photos"
    ON photos
    FOR SELECT
    TO public
    USING (true);

-- Policy: Authenticated users can insert photos
CREATE POLICY "Authenticated users can insert photos"
    ON photos
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = uploaded_by);

-- Policy: Authenticated users can update their own photos
CREATE POLICY "Authenticated users can update own photos"
    ON photos
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = uploaded_by)
    WITH CHECK (auth.uid() = uploaded_by);

-- Policy: Authenticated users can delete their own photos
CREATE POLICY "Authenticated users can delete own photos"
    ON photos
    FOR DELETE
    TO authenticated
    USING (auth.uid() = uploaded_by);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on row update
CREATE TRIGGER update_photos_updated_at
    BEFORE UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket policies (run these in Supabase dashboard SQL editor)
-- Note: Storage bucket "photos" should be created with public access for reading

-- INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

-- CREATE POLICY "Public can view photos in storage"
--     ON storage.objects
--     FOR SELECT
--     TO public
--     USING (bucket_id = 'photos');

-- CREATE POLICY "Authenticated users can upload photos"
--     ON storage.objects
--     FOR INSERT
--     TO authenticated
--     WITH CHECK (bucket_id = 'photos');

-- CREATE POLICY "Authenticated users can update their photos"
--     ON storage.objects
--     FOR UPDATE
--     TO authenticated
--     USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Authenticated users can delete their photos"
--     ON storage.objects
--     FOR DELETE
--     TO authenticated
--     USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
