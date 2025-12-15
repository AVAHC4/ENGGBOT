import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Use environment variables - with build-time safety
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Lazy-initialized admin client to avoid build-time errors
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  if (!SUPABASE_URL) {
    console.warn('[supabase-admin] Missing NEXT_PUBLIC_SUPABASE_URL. Admin operations will fail.');
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[supabase-admin] Missing SUPABASE_SERVICE_ROLE_KEY. API routes requiring DB writes will fail.');
  }

  _supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'enggbot-ai-ui-admin',
      },
    },
  });

  return _supabaseAdmin;
}

// Export a proxy that lazily initializes the client
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabaseAdmin();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

export type DbUser = {
  id: string
  email: string
  name?: string | null
  avatar?: string | null
}
