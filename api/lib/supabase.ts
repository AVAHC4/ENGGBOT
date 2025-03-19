import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://***REMOVED***';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '***REMOVED***';

export const supabase = createClient(supabaseUrl, supabaseKey); 