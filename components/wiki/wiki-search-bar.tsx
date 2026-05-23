'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18/i18n-context';

interface Props {
  initialQuery?: string;
}

export function WikiSearchBar({ initialQuery = '' }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const triggerNavigate = (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length === 0) {
      router.push('/wiki');
    } else {
      router.push(`/wiki/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => triggerNavigate(next), 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    triggerNavigate(value);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={t('wiki.search_placeholder')}
        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
      />
    </form>
  );
}
