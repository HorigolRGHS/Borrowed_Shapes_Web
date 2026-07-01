'use client';
import { useEffect, useState } from 'react';
import { getUserProfile } from '@/lib/api/api-client';

export function useUserRole(): string | null {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    const p = getUserProfile();
    setRole(p?.role ?? null);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ role?: string | null }>).detail;
      setRole(detail?.role ?? null);
    };
    window.addEventListener('api:profile-updated', handler);
    return () => window.removeEventListener('api:profile-updated', handler);
  }, []);
  return role;
}
