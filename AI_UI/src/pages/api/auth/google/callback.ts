import type { NextApiRequest, NextApiResponse } from 'next'

function getOrigin(req: NextApiRequest) {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
  const host = (req.headers['x-forwarded-host'] as string) || (req.headers['host'] as string)
  return `${proto}://${host}`
}

function parseCookies(req: NextApiRequest): Record<string, string> {
  const header = req.headers.cookie
  const out: Record<string, string> = {}
  if (!header) return out
  header.split(';').forEach(part => {
    const [k, ...v] = part.trim().split('=')
    out[k] = decodeURIComponent(v.join('='))
  })
  return out
}

async function exchangeCodeForTokens(params: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
}) {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: 'authorization_code',
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${res.status} ${res.statusText} - ${text}`)
  }
  return res.json() as Promise<{ access_token: string; id_token?: string; expires_in: number; token_type: string; refresh_token?: string }>
}

async function fetchGoogleUser(accessToken: string) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch user: ${res.status} ${res.statusText} - ${text}`)
  }
  return res.json() as Promise<{ id: string; email?: string; name?: string; picture?: string }>
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const origin = getOrigin(req)
    const url = new URL(origin + req.url!)

    const stateFromQuery = url.searchParams.get('state') || ''
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    if (error) {
      res.writeHead(302, { Location: `${origin}/login?error=${encodeURIComponent(error)}` })
      return res.end()
    }
    if (!code) {
      res.writeHead(302, { Location: `${origin}/login?error=no_code` })
      return res.end()
    }

    const cookies = parseCookies(req)
    if (!cookies['oauth_state'] || cookies['oauth_state'] !== stateFromQuery) {
      res.writeHead(302, { Location: `${origin}/login?error=invalid_state` })
      return res.end()
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      res.writeHead(302, { Location: `${origin}/login?error=server_config` })
      return res.end()
    }

    const redirectUri = `${origin}/api/auth/google/callback`
    const token = await exchangeCodeForTokens({ code, clientId, clientSecret, redirectUri })
    const profile = await fetchGoogleUser(token.access_token)

    const aiUiUrl = `${origin}/AI_UI/?auth_success=true`
    const userPayload = {
      id: profile.id,
      name: profile.name || '',
      email: profile.email || '',
      avatar: profile.picture || '',
      provider: 'google',
    }
    const encoded = encodeURIComponent(JSON.stringify(userPayload))

    const finalRedirect = `${aiUiUrl}&user=${encoded}`

    // Clear state cookie
    res.setHeader('Set-Cookie', 'oauth_state=; Path=/; Max-Age=0')
    res.writeHead(302, { Location: finalRedirect })
    return res.end()
  } catch (err: any) {
    const origin = getOrigin(req)
    res.writeHead(302, { Location: `${origin}/login?error=${encodeURIComponent(err?.message || 'oauth_failed')}` })
    return res.end()
  }
}
