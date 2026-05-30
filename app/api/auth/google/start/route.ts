import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

function base64Url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const platform = url.searchParams.get('platform') ?? 'game';
  const returnTo = url.searchParams.get('return_to') ?? '';

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json({ message: 'Google not configured' }, { status: 500 });
  }

  // PKCE code verifier/challenge
  const codeVerifier = base64Url(crypto.randomBytes(32));
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = base64Url(Buffer.from(hash));

  const stateObj = { platform, returnTo };
  const state = base64Url(Buffer.from(JSON.stringify(stateObj)));

  const cookieStore = await cookies();
  cookieStore.set('google_pkce', codeVerifier, { path: '/api/auth/google/callback', maxAge: 300 });
  cookieStore.set('google_state', state, { path: '/api/auth/google/callback', maxAge: 300 });

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    prompt: 'select_account',
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
