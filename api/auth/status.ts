import { Request, Response } from 'express';

// Define the user type to match what we store in the session
interface GoogleUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

// Extend Express Request to include our user type
declare global {
  namespace Express {
    interface User extends GoogleUser {}
  }
}

export default function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if user is authenticated via session
  if (!req.user) {
    return res.status(200).json({
      authenticated: false,
      user: null
    });
  }

  const user = req.user as GoogleUser;

  // Return authentication status and user data
  return res.status(200).json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture
    }
  });
} 