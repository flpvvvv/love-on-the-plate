-- User profiles table for role management
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Policy: Service role can manage all profiles (for manual admin approval)
CREATE POLICY "Service role can manage profiles"
    ON user_profiles
    FOR ALL
    TO service_role
    USING (true);

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create profile when new user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Update photos RLS policies to require admin for INSERT
DROP POLICY IF EXISTS "Authenticated users can insert photos" ON photos;
CREATE POLICY "Admins can insert photos"
    ON photos
    FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

-- Update UPDATE policy: owner OR admin can update
DROP POLICY IF EXISTS "Authenticated users can update own photos" ON photos;
CREATE POLICY "Owner or admin can update photos"
    ON photos
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = uploaded_by OR is_admin())
    WITH CHECK (auth.uid() = uploaded_by OR is_admin());

-- Update DELETE policy: owner OR admin can delete
DROP POLICY IF EXISTS "Authenticated users can delete own photos" ON photos;
CREATE POLICY "Owner or admin can delete photos"
    ON photos
    FOR DELETE
    TO authenticated
    USING (auth.uid() = uploaded_by OR is_admin());
