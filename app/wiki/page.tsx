import type { Metadata } from 'next';
import { Suspense } from 'react';
import { fetchWikiList } from '@/lib/wiki/api';
import { WikiList } from '@/components/wiki/wiki-list';
import { WikiSearchBar } from '@/components/wiki/wiki-search-bar';
import type { WikiListResponse } from '@/models/dtos/wiki.dto';

export const metadata: Metadata = {
  title: 'Wiki',
};

export const dynamic = 'force-dynamic';

export default async function WikiListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim() || undefined;

  let data: WikiListResponse | undefined;
  let errorMessage: string | null = null;
  try {
    data = await fetchWikiList({ page, limit: 20, q });
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } };
    errorMessage = e?.response?.data?.message ?? 'Failed to load wiki list';
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Wiki</h1>
      </header>
      <div className="mb-6">
        <WikiSearchBar initialQuery={q ?? ''} />
      </div>
      {errorMessage && (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 px-4 py-3 mb-4">
          {errorMessage}
        </div>
      )}
      {data && (
        <Suspense fallback={<div>Loading…</div>}>
          <WikiList
            data={data}
            basePath="/wiki"
            extraParams={q ? { q } : undefined}
          />
        </Suspense>
      )}
    </main>
  );
}
