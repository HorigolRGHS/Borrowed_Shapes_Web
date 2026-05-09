import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

function parseState(state: string): { platform?: string; returnTo?: string } {
  try {
    return JSON.parse(Buffer.from(state, 'base64').toString('utf-8')) as {
      platform?: string;
      returnTo?: string;
    };
  } catch {
    return {};
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get('google_pkce')?.value;
  const storedState = cookieStore.get('google_state')?.value;

  cookieStore.delete('google_pkce');
  cookieStore.delete('google_state');

  if (!code || !state || !codeVerifier || state !== storedState) {
    return NextResponse.json({ message: 'Invalid Google callback' }, { status: 400 });
  }

  const stateJson = parseState(state);
  const platform = stateJson.platform ?? 'game';
  const returnTo = stateJson.returnTo ?? '';

  try {
    const res = await fetch(`${NEXT_PUBLIC_API_BASE_URL}/api/auth/google/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        codeVerifier,
        redirectUri: process.env.GOOGLE_REDIRECT_URI,
        platform,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Exchange failed' }));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    const loginCode = data?.data?.loginCode ?? data?.loginCode ?? null;
    if (!loginCode) {
      return NextResponse.json({ message: 'No login code returned' }, { status: 500 });
    }

    if (returnTo) {
      try {
        const parsed = new URL(returnTo);
        parsed.searchParams.set('loginCode', loginCode);
        return NextResponse.redirect(parsed.toString());
      } catch {
        const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Sign-in successful</title>
  </head>
  <body>
    <h1>Sign-in successful</h1>
    <p>Signing you into the app...</p>
    <pre id="code" style="font-size:18px">${loginCode}</pre>
    <script>
      (function(){
        const code = '${loginCode}';
        const target = '${returnTo}';
        try {
          const next = target + (target.includes('?') ? '&' : '?') + 'loginCode=' + encodeURIComponent(code);
          window.location.href = next;
        } catch(e) {}
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'google-login', loginCode: code }, '*');
            window.close();
            return;
          }
        } catch(e) {}
        try { navigator.clipboard.writeText(code); } catch(e) {}
      })();
    </script>
    <p>If nothing happened, copy the code above into the game client.</p>
  </body>
</html>`;
        return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
      }
    }

    const html = `<!doctype html><html><body><h1>Sign-in successful</h1><p>Copy this code into your game client:</p><pre style="font-size:18px">${loginCode}</pre><p>You may now close this window.</p><script>navigator.clipboard?.writeText('${loginCode}');</script></body></html>`;
    return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
