import { createClient } from '@supabase/supabase-js';

// Use environment variables - no hardcoded credentials for security
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a Supabase client with the SERVICE ROLE key (bypasses RLS)
if (SUPABASE_SERVICE_KEY) {
    console.log('Creating Supabase client with SERVICE ROLE KEY (bypasses RLS)');
} else {
    console.warn('[api/supabase] No SERVICE_ROLE_KEY found, using ANON KEY (RLS applies)');
}

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Also export a client with the anon key for frontend use
export const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
