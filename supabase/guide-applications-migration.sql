-- SafarGo Guide Applications Migration
-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS guide_applications (
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

-- Users can view their own applications
CREATE POLICY "Users can view own applications"
    ON guide_applications FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can create their own applications
CREATE POLICY "Users can submit applications"
    ON guide_applications FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Admin can view all applications
CREATE POLICY "Admin can view all applications"
    ON guide_applications FOR SELECT TO authenticated
    USING (true);

-- Admin can update application status
CREATE POLICY "Admin can update applications"
    ON guide_applications FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_guide_applications_user_id ON guide_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_guide_applications_status ON guide_applications(status);
