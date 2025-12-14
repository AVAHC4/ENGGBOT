import { createClient } from '@supabase/supabase-js';

// Use environment variables - no hardcoded credentials for security
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

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

// Optional dev-only Supabase connection test (disabled in production to avoid cold-start latency)
if (process.env.NODE_ENV === 'development' && process.env.SUPABASE_TEST === '1') {
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
}