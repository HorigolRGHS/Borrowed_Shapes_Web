import { NextRequest, NextResponse } from 'next/server';

const NESTJS_URL = process.env.NESTJS_URL ?? 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ message: 'Missing token' }, { status: 400 });
  }

  const res = await fetch(`${NESTJS_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
    method: 'POST',
  });

  const payload = await res.json().catch(() => ({ message: 'Verification failed' }));
  return NextResponse.json(payload, { status: res.status });
}
