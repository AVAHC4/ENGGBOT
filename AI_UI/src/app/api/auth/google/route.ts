export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

// GET /api/auth/google
// Initiates Google OAuth by redirecting to Google's consent page.
export async function GET(req: NextRequest) {
  try {
    // Derive a fixed public base origin for consistent cookies/redirects
    // Prefer AUTH_PUBLIC_ORIGIN, fallback to NEXT_PUBLIC_MAIN_APP_URL
    const configured = process.env.AUTH_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_MAIN_APP_URL;
    const baseOrigin = configured ? new URL(configured).origin : req.nextUrl.origin;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET; // not used here, but validate presence early
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET' }, { status: 500 });
    }

    const state = randomBytes(16).toString('hex');
    // Set short-lived, httpOnly state cookie for CSRF protection
    cookies().set('oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10, // 10 minutes
      // Ensure cookie is scoped to the public domain we're using
      domain: new URL(baseOrigin).hostname,
    });

    const redirectUri = `${baseOrigin}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      include_granted_scopes: 'true',
      state,
      prompt: 'select_account',
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return NextResponse.redirect(url);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'OAuth init failed' }, { status: 500 });
  }
}
