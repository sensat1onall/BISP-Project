-- SafarGo Chat Tables Migration
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Chat Groups (one per trip)
CREATE TABLE IF NOT EXISTS chat_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(trip_id)
);

-- 2. Chat Members (users in each group)
CREATE TABLE IF NOT EXISTS chat_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(chat_id, user_id)
);

-- 3. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE,
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

-- 5. RLS Policies - Chat Groups
CREATE POLICY "Members can view their chat groups"
    ON chat_groups FOR SELECT
    USING (id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can create chat groups"
    ON chat_groups FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- 6. RLS Policies - Chat Members
CREATE POLICY "Members can view group members"
    ON chat_members FOR SELECT
    USING (chat_id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can join groups"
    ON chat_members FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- 7. RLS Policies - Chat Messages
CREATE POLICY "Members can read messages in their groups"
    ON chat_messages FOR SELECT
    USING (chat_id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can send messages to their groups"
    ON chat_messages FOR INSERT
    WITH CHECK (chat_id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()) OR is_ai = true);

-- Allow AI messages to be inserted by anyone (for the welcome message)
CREATE POLICY "Allow AI message insertion"
    ON chat_messages FOR INSERT
    WITH CHECK (is_ai = true);

-- 8. Enable Realtime on chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- 9. Index for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_groups_trip_id ON chat_groups(trip_id);
