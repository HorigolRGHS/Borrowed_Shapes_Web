import { NextRequest, NextResponse } from 'next/server';

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ message: 'Missing token' }, { status: 400 });
  }

  const res = await fetch(`${NEXT_PUBLIC_API_BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`, {
    method: 'POST',
  });

  const payload = await res.json().catch(() => ({ message: 'Verification failed' }));
  return NextResponse.json(payload, { status: res.status });
}
