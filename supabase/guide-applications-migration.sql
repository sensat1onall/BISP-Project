-- SafarGo Guide Applications Migration
-- Run this in Supabase Dashboard > SQL Editor
-- Safe to re-run (drops and recreates)

DROP TABLE IF EXISTS guide_applications CASCADE;

CREATE TABLE guide_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    surname TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    experience TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    reviewed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE guide_applications ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies for authenticated users
CREATE POLICY "Authenticated users can view applications"
    ON guide_applications FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert applications"
    ON guide_applications FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update applications"
    ON guide_applications FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guide_applications_user_id ON guide_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_guide_applications_status ON guide_applications(status);
