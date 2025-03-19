import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://yomqagzashihmrnrvltv.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvbXFhZ3phc2hpaG1ybnJ2bHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzODI5NjgsImV4cCI6MjA1Nzk1ODk2OH0.Kw4eEoaWfv00X9T0Vo5AOocpIaAiekblT2sjutJTi30';

export const supabase = createClient(supabaseUrl, supabaseKey); 