import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ApiResponse } from '@/models/dtos/api-response.dto';
import { api } from '@/lib/api/api-client';

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';

function getPublicOrigin(req: Request): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  const proto =
    req.headers.get('x-forwarded-proto') ??
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const host =
    req.headers.get('x-forwarded-host') ??
    req.headers.get('host') ??
    new URL(req.url).host;
  return `${proto}://${host}`;
}

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

  const origin = getPublicOrigin(req);

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
        const response = NextResponse.redirect(new URL('/', origin));
        
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
        const loginUrl = new URL('/auth/login', origin);
        loginUrl.searchParams.set('error', backendMessage);
        return NextResponse.redirect(loginUrl);
      }
    }

    // --- Xử lý cho Game/Desktop ---
    const redirectUrl = new URL('/auth/google/finish', origin);
    redirectUrl.searchParams.set('loginCode', loginCode);
    if (returnTo) {
      redirectUrl.searchParams.set('returnTo', returnTo);
    }
    return NextResponse.redirect(redirectUrl);
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
