import { Request, Response } from 'express';

interface GoogleUser {
  displayName?: string;
  name?: string;
  email: string;
  picture?: string;
  avatar?: string;
}

export default function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = req.user as GoogleUser;

  // Return user data in the expected format
  const userData = {
    name: user.displayName || user.name || 'Anonymous User',
    email: user.email,
    avatar: user.picture || user.avatar || 'https://ferf1mheo22r9ira.public.blob.vercel-storage.com/avatar-02-albo9B0tWOSLXCVZh9rX9KFxXIVWMr.png',
  };

  console.log('Returning user data:', userData);
  return res.status(200).json(userData);
} 