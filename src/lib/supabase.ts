// =============================================================================
// supabase.ts — Supabase client initialization
// =============================================================================
// This is where we set up the Supabase connection. We're using hardcoded credentials here
// because Railway (our deployment platform) was truncating the environment variable for the
// anon key, which caused "invalid API key" errors. The anon key is public by design anyway
// — every browser that loads the app gets this key in the JS bundle, and Supabase's Row
// Level Security (RLS) policies are what actually protect the data, not the anon key.
// So hardcoding it is safe and avoids the Railway env var truncation headache.
// =============================================================================

import { createClient } from '@supabase/supabase-js';

// These are the project-specific Supabase credentials.
// The URL points to our Supabase project instance, and the anon key gives us
// public-level access. All sensitive operations are gated by RLS policies on the DB side.
const supabaseUrl = 'https://aeuitntkfcyqvdpxeboz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldWl0bnRrZmN5cXZkcHhlYm96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTc3MjAsImV4cCI6MjA5MTEzMzcyMH0.N1Vm4RmI3jcVtzzK2DdkLb8cEBLv4Bdm7k2NCKDsmOU';

// Create and export the Supabase client. This single instance is shared across the entire
// app — we import it wherever we need to talk to the database, auth, or storage.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
