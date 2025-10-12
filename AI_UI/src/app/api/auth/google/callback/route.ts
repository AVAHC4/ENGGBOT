export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function exchangeCodeForTokens(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${res.statusText} - ${text}`);
  }
  return res.json() as Promise<{ access_token: string; id_token?: string; expires_in: number; token_type: string; refresh_token?: string }>;
}

async function fetchGoogleUser(accessToken: string) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch user: ${res.status} ${res.statusText} - ${text}`);
  }
  return res.json() as Promise<{ id: string; email?: string; name?: string; picture?: string }>;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    // Derive a fixed public base origin for consistent cookie/redirect behavior
    // e.g. NEXT_PUBLIC_MAIN_APP_URL=https://www.enggbot.me/login
    const configured = process.env.NEXT_PUBLIC_MAIN_APP_URL;
    const baseOrigin = configured ? new URL(configured).origin : req.nextUrl.origin;

    const stateFromQuery = url.searchParams.get('state') || '';
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    if (error) {
      return NextResponse.redirect(`${baseOrigin}/login?error=${encodeURIComponent(error)}`);
    }
    if (!code) {
      return NextResponse.redirect(`${baseOrigin}/login?error=no_code`);
    }

    // Validate state to mitigate CSRF
    const stateCookie = cookies().get('oauth_state');
    if (!stateCookie || stateCookie.value !== stateFromQuery) {
      return NextResponse.redirect(`${baseOrigin}/login?error=invalid_state`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${baseOrigin}/login?error=server_config`);
    }

    const redirectUri = `${baseOrigin}/api/auth/google/callback`;

    const token = await exchangeCodeForTokens({ code, clientId, clientSecret, redirectUri });
    const profile = await fetchGoogleUser(token.access_token);

    // Build redirect to AI_UI chat with user info
    const aiUiUrl = `${baseOrigin}/AI_UI/?auth_success=true`;
    const userPayload = {
      id: profile.id,
      name: profile.name || '',
      email: profile.email || '',
      avatar: profile.picture || '',
      provider: 'google',
    };
    const encoded = encodeURIComponent(JSON.stringify(userPayload));

    const redirectUrl = `${aiUiUrl}&user=${encoded}`;

    // Clear state cookie (best-effort)
    cookies().set('oauth_state', '', { path: '/', maxAge: 0 });

    return NextResponse.redirect(redirectUrl);
  } catch (err: any) {
    const configuredEnv = process.env.NEXT_PUBLIC_MAIN_APP_URL;
    const origin = configuredEnv ? new URL(configuredEnv).origin : req.nextUrl.origin;
    const message = encodeURIComponent(err?.message || 'oauth_failed');
    return NextResponse.redirect(`${origin}/login?error=${message}`);
  }
}
