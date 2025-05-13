import { createClient } from '@supabase/supabase-js';

// Fixed values that we KNOW work (same as in the API)
const SUPABASE_URL = 'https://***REMOVED***';
const SUPABASE_ANON_KEY = '***REMOVED***';

// Create a Supabase client with the anon key for frontend use
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}); 