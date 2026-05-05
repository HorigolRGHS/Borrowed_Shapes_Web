import { NextRequest, NextResponse } from 'next/server';

const NESTJS_URL = process.env.NESTJS_URL ?? 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ message: 'Missing token' }, { status: 400 });
  }

  const body = await req.json();

  const res = await fetch(`${NESTJS_URL}/api/auth/reset-password?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => ({ message: 'Reset password failed' }));
  return NextResponse.json(payload, { status: res.status });
}
