// A simplified Google OAuth handler for Vercel serverless functions
import { createClient } from '@supabase/supabase-js';

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // CORS handling
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'https://www.enggbot.me');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const path = req.url.split('?')[0];
  
  // Handle Google OAuth login - just redirect to Google login page
  if (path === '/api/auth/google') {
    const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.CLIENT_URL + '/api/auth/google/callback')}&response_type=code&scope=email%20profile`;
    return res.redirect(302, redirectUrl);
  }
  
  // Handle Google OAuth callback
  if (path === '/api/auth/google/callback') {
    try {
      const code = req.query.code;
      
      // This would normally exchange the code for a token and get user info
      // For this simplified version, we'll just redirect to the chat page
      return res.redirect(302, `${process.env.CLIENT_URL}/chat`);
    } catch (error) {
      console.error('Error in Google callback:', error);
      return res.redirect(302, `${process.env.CLIENT_URL}?error=auth_failed`);
    }
  }
  
  // User status endpoint
  if (path === '/api/auth/status') {
    // In a real implementation, we would check user session
    // For this simplified version, we'll just return "not authenticated"
    return res.status(200).json({ 
      authenticated: false,
      message: 'This is a simplified version - authentication not implemented'
    });
  }
  
  // Default catch-all response
  return res.status(404).json({ error: 'Auth endpoint not found' });
} 