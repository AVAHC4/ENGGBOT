// A simplified version of our API for Vercel serverless functions
import { createClient } from '@supabase/supabase-js';

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // CORS handling
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'https://enggbot.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const path = req.url.split('?')[0];
  
  // Handle different API endpoints
  if (path === '/api/hello') {
    return res.status(200).json({ message: 'Hello from the API!' });
  }
  
  if (path === '/api/health') {
    return res.status(200).json({ status: 'ok' });
  }
  
  if (path === '/api/test-connection') {
    try {
      const { data, error } = await supabase.from('users').select('count');
      if (error) {
        throw error;
      }
      return res.status(200).json({ status: 'success', message: 'Connected to Supabase!', data });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: 'Failed to connect to Supabase' });
    }
  }
  
  // Default catch-all response
  return res.status(404).json({ error: 'API endpoint not found' });
} 