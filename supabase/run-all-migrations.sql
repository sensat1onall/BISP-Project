-- SafarGo: Run ALL Migrations
-- Paste this ENTIRE file into Supabase Dashboard > SQL Editor > Run
-- Safe to run multiple times

-- ============================================
-- 1. ADMIN POWERS: Add columns to profiles and trips
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- ============================================
-- 2. RLS POLICIES: Allow updates on profiles and trips
-- ============================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can update profiles') THEN
        CREATE POLICY "Authenticated can update profiles" ON profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can update trips') THEN
        CREATE POLICY "Authenticated can update trips" ON trips FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can delete trips') THEN
        CREATE POLICY "Authenticated can delete trips" ON trips FOR DELETE TO authenticated USING (true);
    END IF;
END $$;

-- ============================================
-- 3. CHAT TABLES
-- ============================================
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_members CASCADE;
DROP TABLE IF EXISTS chat_groups CASCADE;

CREATE TABLE chat_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(trip_id)
);

CREATE TABLE chat_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(chat_id, user_id)
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id),
    sender_name TEXT NOT NULL DEFAULT '',
    sender_avatar TEXT DEFAULT '',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_ai BOOLEAN DEFAULT false
);

ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view chat_groups" ON chat_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert chat_groups" ON chat_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth view chat_members" ON chat_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert chat_members" ON chat_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Members read messages" ON chat_messages FOR SELECT TO authenticated USING (chat_id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()));
CREATE POLICY "Members send messages" ON chat_messages FOR INSERT TO authenticated WITH CHECK (chat_id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()) OR is_ai = true);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_groups_trip_id ON chat_groups(trip_id);

-- ============================================
-- 4. GUIDE APPLICATIONS TABLE
-- ============================================
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

ALTER TABLE guide_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view guide_apps" ON guide_applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert guide_apps" ON guide_applications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update guide_apps" ON guide_applications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_guide_applications_user_id ON guide_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_guide_applications_status ON guide_applications(status);

-- ============================================
-- DONE! All tables and policies created.
-- ============================================
