import { createClient } from '@supabase/supabase-js'

// Use environment variables - no fallbacks to avoid exposing credentials in code
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  // Intentionally avoid throwing at import time in case code paths don't need admin
  console.warn('[supabase-admin] Missing SUPABASE_SERVICE_ROLE_KEY. API routes requiring DB writes will fail.')
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'enggbot-ai-ui-admin',
    },
  },
})

export type DbUser = {
  id: string
  email: string
  name?: string | null
  avatar?: string | null
}
