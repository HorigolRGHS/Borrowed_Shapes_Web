import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const NESTJS_URL = process.env.NESTJS_URL ?? 'http://localhost:3001';

export async function DELETE() {
  const cookieStore = await cookies();
  const at = cookieStore.get('at')?.value;

  if (at) {
    // Best-effort: always clear cookies even if NestJS call fails
    await fetch(`${NESTJS_URL}/api/auth/logout`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${at}` },
    }).catch(() => {});
  }

  cookieStore.delete('at');
  cookieStore.delete('rt');

  return new NextResponse(null, { status: 204 });
}
