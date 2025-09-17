import { createClient } from '@supabase/supabase-js';

// Prefer environment variables (safe for client with NEXT_PUBLIC_ prefix). Fall back to existing constants for local dev.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://***REMOVED***';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '***REMOVED***';

// Create a Supabase client with persistent sessions for OAuth
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});