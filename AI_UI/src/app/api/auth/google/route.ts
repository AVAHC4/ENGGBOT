export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

 
 
export async function GET(req: NextRequest) {
  try {
     
     
    const configured = process.env.NEXT_PUBLIC_MAIN_APP_URL;
    const baseOrigin = configured ? new URL(configured).origin : req.nextUrl.origin;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;  
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET' }, { status: 500 });
    }

    const state = randomBytes(16).toString('hex');
     
    cookies().set('oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10,  
       
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
