import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const NESTJS_URL = process.env.NESTJS_URL ?? 'http://localhost:3001';

export async function POST() {
  const cookieStore = await cookies();
  const rt = cookieStore.get('rt')?.value;

  if (!rt) {
    return NextResponse.json({ message: 'No refresh token' }, { status: 401 });
  }

  const res = await fetch(`${NESTJS_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  });

  if (!res.ok) {
    cookieStore.delete('at');
    cookieStore.delete('rt');
    return NextResponse.json({ message: 'Session expired' }, { status: 401 });
  }

  const data = await res.json();
  const isProd = process.env.NODE_ENV === 'production';

  cookieStore.set('at', data.accessToken, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: data.expiresIn,
    secure: isProd,
  });

  cookieStore.set('rt', data.refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/api/auth/refresh',
    maxAge: 60 * 60 * 24 * 7,
    secure: isProd,
  });

  return new NextResponse(null, { status: 204 });
}
