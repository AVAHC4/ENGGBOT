import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use environment variables for Supabase credentials
// These are safe to use at build time - will be empty strings if not set
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a lazy-initialized Supabase client to avoid build-time errors
let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // During build or when env vars are missing, return a dummy client that will fail gracefully
    console.warn('[supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY. Client operations will fail.');
  }

  _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });

  return _supabase;
}

// Export a proxy that lazily initializes the client
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});