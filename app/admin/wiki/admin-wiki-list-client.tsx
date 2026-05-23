'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18/i18n-context';
import { fetchAdminWikiList } from '@/lib/wiki/api';
import type { WikiListResponse } from '@/models/dtos/wiki.dto';
import { WikiPagination } from '@/components/wiki/wiki-pagination';
import { WikiAdminCard } from '@/components/wiki/wiki-admin-card';

type FilterMode = 'all' | 'published' | 'draft';

export function AdminWikiListClient() {
  const { t } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const filter: FilterMode = (sp.get('filter') as FilterMode) ?? 'all';

  const [data, setData] = useState<WikiListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Backend admin endpoint always returns drafts + published; filter client-side for MVP.
      const result = await fetchAdminWikiList({ page, limit: 20 });
      let items = result.items;
      if (filter === 'published') items = items.filter((i) => i.isPublished);
      if (filter === 'draft') items = items.filter((i) => !i.isPublished);
      setData({ ...result, items });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { void load(); }, [load]);

  const handleFilter = (next: FilterMode) => {
    const newSp = new URLSearchParams();
    if (next !== 'all') newSp.set('filter', next);
    router.push(`/admin/wiki${newSp.toString() ? '?' + newSp.toString() : ''}`);
  };

  const handleDeleted = (id: string) => {
    if (!data) return;
    setData({ ...data, items: data.items.filter((i) => i.id !== id), total: Math.max(0, data.total - 1) });
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin · Wiki</h1>
          <p className="text-sm text-gray-500 mt-1">{t('wiki.list_subtitle')}</p>
        </div>
        <Link
          href="/admin/wiki/new"
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('wiki.create_button')}
        </Link>
      </header>

      <div className="mb-6 flex gap-2">
        {(['all', 'published', 'draft'] as FilterMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleFilter(m)}
            className={`px-3 py-1 rounded border text-sm ${m === filter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-100'}`}
          >
            {m === 'all' ? 'All' : m === 'published' ? t('wiki.published_badge') : t('wiki.draft_badge')}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-500">…</p>}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 px-4 py-3 mb-4">{error}</div>
      )}
      {data && data.items.length === 0 && (
        <div className="text-center py-16 text-gray-500">{t('wiki.empty_list')}</div>
      )}
      {data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.items.map((item) => (
              <WikiAdminCard key={item.id} item={item} onDeleted={handleDeleted} />
            ))}
          </div>
          <WikiPagination
            page={data.page}
            totalPages={data.totalPages}
            basePath="/admin/wiki"
            extraParams={filter !== 'all' ? { filter } : undefined}
          />
        </>
      )}
    </main>
  );
}
