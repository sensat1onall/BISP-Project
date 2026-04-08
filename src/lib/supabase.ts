import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aeuitntkfcyqvdpxeboz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldWl0bnRrZmN5cXZkcHhlYm96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTc3MjAsImV4cCI6MjA5MTEzMzcyMH0.N1Vm4RmI3jcVtzzK2DdkLb8cEBLv4Bdm7k2NCKDsmOU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
