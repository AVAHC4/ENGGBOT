import { createClient } from '@supabase/supabase-js';

// Fixed values that we KNOW work (these are already in your .env)
const SUPABASE_URL = 'https://yomqagzashihmrnrvltv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvbXFhZ3phc2hpaG1ybnJ2bHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjM4Mjk2OCwiZXhwIjoyMDU3OTU4OTY4fQ.TZE9InycI2bzvrXWNaiDGyJhrmFRZ7yld_7MWhK9c6s';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvbXFhZ3phc2hpaG1ybnJ2bHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzODI5NjgsImV4cCI6MjA1Nzk1ODk2OH0.Kw4eEoaWfv00X9T0Vo5AOocpIaAiekblT2sjutJTi30';

// Create a Supabase client with the SERVICE ROLE key
console.log('Creating Supabase client with SERVICE ROLE KEY (bypasses RLS)');
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Also export a client with the anon key for frontend use
export const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test insert to verify it works with the service role key
(async () => {
  try {
    console.log('Testing Supabase connection with SERVICE ROLE KEY...');
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      google_id: `test-${Date.now()}`
    };
    
    const { data, error } = await supabase
      .from('users')
      .insert(testUser)
      .select()
      .single();
      
    if (error) {
      console.error('❌ TEST INSERT FAILED:', error);
      console.error('This suggests the service role key is not working properly.');
    } else {
      console.log('✅ TEST INSERT SUCCESSFUL!', data);
      console.log('The service role key is working properly.');
      
      // Clean up the test user
      await supabase
        .from('users')
        .delete()
        .match({ id: data.id });
    }
  } catch (err) {
    console.error('Error testing Supabase connection:', err);
  }
})(); 