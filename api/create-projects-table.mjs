import { createClient } from '@supabase/supabase-js';

// Use the same Supabase configuration from the API
const SUPABASE_URL = 'https://***REMOVED***';
const SUPABASE_SERVICE_KEY = '***REMOVED***';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createProjectsTable() {
  try {
    console.log('🚀 Creating projects table...');
    
    // Check if projects table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'projects')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('Cannot check existing tables, proceeding with creation...');
    }
    
    // Try to access projects table to see if it exists
    const { data: testData, error: testError } = await supabase
      .from('projects')
      .select('count')
      .limit(1);
    
    if (testError && testError.code === '42P01') {
      console.log('📝 Projects table does not exist. Please create it manually in Supabase SQL Editor:');
      console.log(`
-- Copy and paste this SQL into your Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 255),
    goal TEXT CHECK (LENGTH(goal) <= 2000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON projects TO authenticated;
GRANT ALL ON projects TO service_role;
      `);
      
      console.log('\n🔗 Go to: https://supabase.com/dashboard/project/***REMOVED***/sql/new');
      console.log('   Paste the SQL above and click "Run"');
      
    } else if (testError) {
      console.error('❌ Error accessing projects table:', testError);
    } else {
      console.log('✅ Projects table already exists and is accessible!');
      
      // Test inserting a project
      const testUserId = 'test-user-' + Date.now();
      const { data: insertData, error: insertError } = await supabase
        .from('projects')
        .insert({
          user_id: testUserId,
          name: 'Test Project',
          goal: 'Testing the projects table functionality'
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Error inserting test project:', insertError);
      } else {
        console.log('✅ Successfully inserted test project:', insertData);
        
        // Clean up test project
        await supabase
          .from('projects')
          .delete()
          .eq('id', insertData.id);
        
        console.log('✅ Test project cleaned up');
      }
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

createProjectsTable();
