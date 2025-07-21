import { supabase } from './lib/supabase.ts';

async function runMigration() {
  try {
    console.log('🚀 Running projects table migration...');
    
    // Create projects table
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create projects table
        CREATE TABLE IF NOT EXISTS projects (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 255),
            goal TEXT CHECK (LENGTH(goal) <= 2000),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for efficient querying
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
      `
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      
      // Try direct table creation as fallback
      console.log('📝 Trying direct table creation...');
      
      const { error: directError } = await supabase
        .from('projects')
        .select('count')
        .limit(1);
      
      if (directError && directError.code === '42P01') {
        // Table doesn't exist, create it manually
        console.log('🔧 Creating table manually through SQL...');
        console.error('Please run the following SQL in your Supabase SQL editor:');
        console.log(`
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 255),
    goal TEXT CHECK (LENGTH(goal) <= 2000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
        `);
      } else {
        console.log('✅ Projects table already exists or is accessible');
      }
    } else {
      console.log('✅ Migration completed successfully!');
    }

    // Test the table
    console.log('🧪 Testing projects table...');
    const { data: testData, error: testError } = await supabase
      .from('projects')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ Table test failed:', testError);
      console.log('\n🔍 Please check your Supabase dashboard and ensure:');
      console.log('1. The projects table exists');
      console.log('2. RLS policies allow access');
      console.log('3. The service role has proper permissions');
    } else {
      console.log('✅ Projects table is working correctly!');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

runMigration();
