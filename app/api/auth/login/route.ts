import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const NESTJS_URL = process.env.NESTJS_URL ?? 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const res = await fetch(`${NESTJS_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, platform: 'forum' }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Login failed' }));
    return NextResponse.json(error, { status: res.status });
  }

  const data = await res.json();
  const cookieStore = await cookies();
  const isProd = process.env.NODE_ENV === 'production';

  // Access token — short-lived (15 min), used for API calls
  cookieStore.set('at', data.accessToken, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: data.expiresIn,
    secure: isProd,
  });

  // Refresh token — long-lived (7 days), used to obtain new access tokens
  cookieStore.set('rt', data.refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/api/auth/refresh',
    maxAge: 60 * 60 * 24 * 7,
    secure: isProd,
  });

  const { accessToken: _at, refreshToken: _rt, ...safeData } = data;
  return NextResponse.json(safeData, { status: 200 });
}
