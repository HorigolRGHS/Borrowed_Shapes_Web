import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ApiResponse } from '@/models/dtos/api-response.dto';
import { api } from '@/lib/api/api-client';

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';

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
    // 1. Exchange code for loginCode
    const exchangeRes: ApiResponse<any> = await api.post("/auth/google/exchange", {
      code,
      codeVerifier,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      platform,
    });

    if (!exchangeRes || !exchangeRes.success) {
      return NextResponse.json(
        { message: exchangeRes?.message || 'Exchange failed' },
        { status: exchangeRes?.statusCode || 400 }
      );
    }

    const loginCode = exchangeRes.data?.loginCode ?? null;
    if (!loginCode) {
      return NextResponse.json({ message: 'No login code returned' }, { status: 500 });
    }

    // --- Xử lý cho Web ---
    if (platform === 'web') {
      try {
        const completeRes = await api.post<ApiResponse<any>>("/auth/google/complete", {
          loginCode,
          platform: 'web',
          deviceInfo: req.headers.get('user-agent') || 'Web Browser',
        });

        const authData = completeRes.data;
        const response = NextResponse.redirect(new URL('/', req.url));
        
        if (authData.accessToken) {
          response.cookies.set("accessToken", authData.accessToken, {
            path: "/",
            maxAge: 60 * 15,
            httpOnly: false,
            sameSite: "lax",
          });
        }
        if (authData.refreshToken) {
          response.cookies.set("refreshToken", authData.refreshToken, {
            path: "/",
            maxAge: 7 * 24 * 60 * 60,
            httpOnly: true,
            sameSite: "lax",
          });
        }
        return response;
      } catch (err: any) {
        const backendMessage = err.response?.data?.message || err.message;
        console.error('Google complete failed:', backendMessage);
        
        // Chuyển hướng về login kèm lỗi để người dùng biết (ví dụ: Unverified email)
        const loginUrl = new URL('/auth/login', req.url);
        loginUrl.searchParams.set('error', backendMessage);
        return NextResponse.redirect(loginUrl);
      }
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
