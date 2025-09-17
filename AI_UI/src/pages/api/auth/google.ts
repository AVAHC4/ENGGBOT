import type { NextApiRequest, NextApiResponse } from 'next'
import { randomBytes } from 'crypto'

function getOrigin(req: NextApiRequest) {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
  const host = (req.headers['x-forwarded-host'] as string) || (req.headers['host'] as string)
  return `${proto}://${host}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET' })
    }

    const origin = getOrigin(req)

    // CSRF state cookie
    const state = randomBytes(16).toString('hex')
    const cookie = `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
    res.setHeader('Set-Cookie', cookie)

    const redirectUri = `${origin}/api/auth/google/callback`
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      include_granted_scopes: 'true',
      state,
      prompt: 'select_account',
    })

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    res.writeHead(302, { Location: url })
    res.end()
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'OAuth init failed' })
  }
}
