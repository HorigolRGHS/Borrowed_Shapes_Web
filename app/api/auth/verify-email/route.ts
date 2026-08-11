import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl } from '@/lib/api/runtime-base-url';

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ message: 'Missing token' }, { status: 400 });
  }

  const res = await fetch(`${getBackendBaseUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`, {
    method: 'POST',
  });

  const payload = await res.json().catch(() => ({ message: 'Verification failed' }));
  return NextResponse.json(payload, { status: res.status });
}
