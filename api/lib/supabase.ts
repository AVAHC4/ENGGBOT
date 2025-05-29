import { createClient } from '@supabase/supabase-js';

// Get Supabase config from environment variables
if (!process.env.SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL environment variable is not set!');
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_KEY environment variable is not set!');
}

if (!process.env.SUPABASE_ANON_KEY) {
  console.error('ERROR: SUPABASE_ANON_KEY environment variable is not set!');
}

// Use environment variables or fallback to empty strings for TypeScript
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

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

// Improved connection test with better error handling and recovery
(async () => {
  // Only run the test if we have the necessary credentials
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Cannot test Supabase connection: Missing environment variables');
    return;
  }

  try {
    console.log('Testing Supabase connection with SERVICE ROLE KEY...');
    // First just try a simple select to see if we can connect
    const { data: testSelect, error: selectError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (selectError) {
      console.error('❌ Cannot query the users table:', selectError.message);
      console.error('Please check your database schema and permissions');
      return;
    }
    
    console.log('✅ Successfully connected to Supabase');
    
    // Now try inserting a test user
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
      console.error('❌ TEST INSERT FAILED:', error.message);
      console.error('This suggests the service role key may have insufficient permissions');
      console.error('Please check your Supabase RLS policies or use the service role key');
    } else {
      console.log('✅ TEST INSERT SUCCESSFUL!');
      
      // Clean up the test user
      if (data?.id) {
        await supabase
          .from('users')
          .delete()
          .match({ id: data.id });
        console.log('✅ Test user cleaned up successfully');
      }
    }
  } catch (err) {
    console.error('Error testing Supabase connection:', err);
  }
})(); 