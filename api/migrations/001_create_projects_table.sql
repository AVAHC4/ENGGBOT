-- Migration: Create projects table for ENGGBOT Projects feature
-- This establishes the core database structure for isolated project workspaces

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(google_id) ON DELETE CASCADE,
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

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add Row Level Security (RLS) to ensure users can only access their own projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see and modify their own projects
CREATE POLICY projects_user_isolation ON projects
    FOR ALL
    USING (user_id = auth.jwt() ->> 'sub')
    WITH CHECK (user_id = auth.jwt() ->> 'sub');

-- Grant necessary permissions
GRANT ALL ON projects TO authenticated;
GRANT ALL ON projects TO service_role;

-- Add comments for documentation
COMMENT ON TABLE projects IS 'Stores project workspaces for ENGGBOT users, enabling isolated and persistent collaboration contexts';
COMMENT ON COLUMN projects.user_id IS 'References the Google ID from the users table to establish ownership';
COMMENT ON COLUMN projects.name IS 'Human-readable project name (1-255 characters)';
COMMENT ON COLUMN projects.goal IS 'Detailed description of the project objective (max 2000 characters)';
