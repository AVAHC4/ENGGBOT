import fetch from 'node-fetch';

// Hard-code the values to avoid env issues
const SUPABASE_URL = 'https://yomqagzashihmrnrvltv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvbXFhZ3phc2hpaG1ybnJ2bHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjM4Mjk2OCwiZXhwIjoyMDU3OTU4OTY4fQ.TZE9InycI2bzvrXWNaiDGyJhrmFRZ7yld_7MWhK9c6s';

// This SQL creates a function that can be called to insert a user
const createFunctionSQL = `
CREATE OR REPLACE FUNCTION public.insert_user(
  user_email TEXT,
  user_name TEXT, 
  user_google_id TEXT,
  user_avatar TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user JSONB;
BEGIN
  INSERT INTO public.users (email, name, google_id, avatar, created_at, updated_at)
  VALUES (user_email, user_name, user_google_id, user_avatar, NOW(), NOW())
  RETURNING to_jsonb(users.*) INTO new_user;
  
  RETURN new_user;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.insert_user TO anon, authenticated, service_role;
`;

// Function to execute SQL directly via REST API
async function executeSql(sql) {
  console.log('Executing SQL via REST API...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: sql
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('SQL execution failed:', response.status, errorText);
      return false;
    }
    
    console.log('SQL executed successfully');
    return true;
  } catch (error) {
    console.error('Error executing SQL:', error);
    return false;
  }
}

// Create the function using direct SQL
async function createFunction() {
  console.log('Creating Supabase function for inserting users...');
  return await executeSql(createFunctionSQL);
}

// Run the SQL creation
async function main() {
  const success = await createFunction();
  
  if (success) {
    console.log('✅ User insertion function created successfully!');
    console.log('Now restart your backend server and try Google authentication again.');
  } else {
    console.log('❌ Failed to create the user insertion function.');
    console.log('Alternative: You can manually add this function in the Supabase SQL editor.');
  }
}

main().catch(console.error); 