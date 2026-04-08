-- SafarGo Admin Powers Migration
-- Run this in Supabase Dashboard > SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS)

-- 1. Add is_banned column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- 2. Add is_archived column to trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 3. Allow admin to update any profile (for ban/unban, verify, role change)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Admin can update any profile'
    ) THEN
        CREATE POLICY "Admin can update any profile"
            ON profiles FOR UPDATE TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- 4. Allow admin to update any trip (for archive/unarchive)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Admin can update any trip'
    ) THEN
        CREATE POLICY "Admin can update any trip"
            ON trips FOR UPDATE TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- 5. Allow admin to delete any trip
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Admin can delete any trip'
    ) THEN
        CREATE POLICY "Admin can delete any trip"
            ON trips FOR DELETE TO authenticated
            USING (true);
    END IF;
END $$;
