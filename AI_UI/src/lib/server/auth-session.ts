import 'server-only';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

export interface UserSession {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  provider?: string;
}

const COOKIE_NAME = 'ai_session';
const TOKEN_VERSION = 'v1';

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sign(data: string, secret: string) {
  return base64url(crypto.createHmac('sha256', secret).update(data).digest());
}

export function createSessionToken(payload: UserSession, secret?: string): string | null {
  const s = secret || process.env.APP_SESSION_SECRET;
  if (!s) return null;
  const body = base64url(JSON.stringify(payload));
  const sig = sign(body, s);
  return `${TOKEN_VERSION}.${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null, secret?: string): UserSession | null {
  if (!token) return null;
  const s = secret || process.env.APP_SESSION_SECRET;
  if (!s) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [ver, body, sig] = parts;
  if (ver !== TOKEN_VERSION) return null;
  const expected = sign(body, s);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const json = Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const payload = JSON.parse(json);
    if (!payload || !payload.id) return null;
    return payload as UserSession;
  } catch {
    return null;
  }
}

export function getSessionFromCookies(): UserSession | null {
  try {
    const cookieStore = cookies();
    const raw = cookieStore.get(COOKIE_NAME)?.value;
    return verifySessionToken(raw);
  } catch {
    return null;
  }
}

export function setSessionCookie(res: NextResponse, payload: UserSession) {
  const token = createSessionToken(payload);
  if (!token) return;
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
}
