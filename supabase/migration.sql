-- SafarGo Chat Tables Migration
-- Run this in Supabase Dashboard > SQL Editor
-- NOTE: If you already ran a previous version, run the DROP statements first

-- Drop old tables if they exist (safe to run multiple times)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_members CASCADE;
DROP TABLE IF EXISTS chat_groups CASCADE;

-- 1. Chat Groups (one per trip)
CREATE TABLE chat_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(trip_id)
);

-- 2. Chat Members (users in each group)
CREATE TABLE chat_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(chat_id, user_id)
);

-- 3. Chat Messages
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

-- 4. Enable Row Level Security
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - Chat Groups (permissive for authenticated users)
CREATE POLICY "Authenticated users can view chat groups"
    ON chat_groups FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can create chat groups"
    ON chat_groups FOR INSERT TO authenticated
    WITH CHECK (true);

-- 6. RLS Policies - Chat Members
CREATE POLICY "Authenticated users can view chat members"
    ON chat_members FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can join groups"
    ON chat_members FOR INSERT TO authenticated
    WITH CHECK (true);

-- 7. RLS Policies - Chat Messages (only members can read/write)
CREATE POLICY "Members can read messages in their groups"
    ON chat_messages FOR SELECT TO authenticated
    USING (chat_id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can send messages to their groups"
    ON chat_messages FOR INSERT TO authenticated
    WITH CHECK (
        chat_id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid())
        OR is_ai = true
    );

-- 8. Enable Realtime on chat_messages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    END IF;
END $$;

-- 9. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_groups_trip_id ON chat_groups(trip_id);
