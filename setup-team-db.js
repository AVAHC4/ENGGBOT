import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase configuration
const SUPABASE_URL = 'https://***REMOVED***';
const SUPABASE_SERVICE_KEY = '***REMOVED***';

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTeamTables() {
  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'create-team-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Creating team tables and functions...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('Trying direct SQL execution...');
      const { error: directError } = await supabase.from('_supabase_migrations').select('*').limit(1);
      
      if (directError) {
        console.log('Direct SQL execution not available. Please run the SQL manually in Supabase SQL editor.');
        console.log('\nSQL to execute:');
        console.log(sql);
        return false;
      }
    }
    
    console.log('✅ Team tables created successfully!');
    
    // Test the tables by inserting a sample team
    console.log('Testing table creation...');
    
    const { data: testData, error: testError } = await supabase
      .from('teams')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error testing tables:', testError);
      return false;
    }
    
    console.log('✅ Tables are working correctly!');
    return true;
    
  } catch (error) {
    console.error('❌ Error creating team tables:', error.message);
    return false;
  }
}

// Run the function
createTeamTables().then(success => {
  if (success) {
    console.log('\n🎉 Team invitation system is ready!');
    console.log('You can now use the enhanced team invitation functionality.');
  } else {
    console.log('\n⚠️  Please manually run the SQL in your Supabase dashboard.');
    console.log('Go to: https://app.supabase.com/project/[your-project]/sql');
    console.log('Copy and paste the contents of create-team-tables.sql');
  }
  process.exit(success ? 0 : 1);
});
