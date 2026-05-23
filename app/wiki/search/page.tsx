import { redirect } from 'next/navigation';
import { searchWiki } from '@/lib/wiki/api';
import { WikiList } from '@/components/wiki/wiki-list';
import { WikiSearchBar } from '@/components/wiki/wiki-search-bar';
import type { WikiListResponse } from '@/models/dtos/wiki.dto';

export const dynamic = 'force-dynamic';

export default async function WikiSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  if (!q) redirect('/wiki');
  const page = Math.max(1, Number(params.page) || 1);

  let data: WikiListResponse | undefined;
  let errorMessage: string | null = null;
  try {
    data = await searchWiki(q, page, 20);
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } };
    errorMessage = e?.response?.data?.message ?? 'Search failed';
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <WikiSearchBar initialQuery={q} />
      </div>
      {errorMessage && (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 px-4 py-3 mb-4">
          {errorMessage}
        </div>
      )}
      {data && (
        <WikiList
          data={data}
          emptyMessageKey="wiki.search_no_results"
          buildHref={(p) => {
            const sp = new URLSearchParams({ q });
            if (p > 1) sp.set('page', String(p));
            return `/wiki/search?${sp.toString()}`;
          }}
        />
      )}
    </main>
  );
}
