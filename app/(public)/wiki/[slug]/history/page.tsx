import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { fetchWikiBySlug, fetchWikiHistory } from '@/lib/wiki/api';
import { WikiHistoryList } from '@/components/wiki/wiki-history-list';
import { decodeJwt, normalizeJwt } from '@/lib/utils/jwt';
import { getApiErrorStatus, type ApiError } from '@/lib/wiki/http';
import enDict from '@/locales/en.json';
import viDict from '@/locales/vi.json';

export const dynamic = 'force-dynamic';

export default async function WikiHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  // Auth gate: redirect guests to login
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  const decoded = token ? decodeJwt(token) : null;
  const normalized = decoded ? normalizeJwt(decoded) : null;
  if (!normalized) {
    const { slug: pathSlug } = await params;
    redirect(`/auth/login?from=/wiki/${encodeURIComponent(pathSlug)}/history`);
  }

  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  let detail;
  try {
    detail = await fetchWikiBySlug(slug);
  } catch (err) {
    if (getApiErrorStatus(err as ApiError) === 404) notFound();
    throw err;
  }

  if (slug !== detail.slug) {
    redirect(`/wiki/${encodeURIComponent(detail.slug)}/history`);
  }

  const history = await fetchWikiHistory(detail.id, page, 20);
  const title = detail.title;

  const uiLocale = cookieStore.get('NEXT_LOCALE')?.value === 'vi' ? 'vi' : 'en';
  const dict = uiLocale === 'vi' ? viDict : enDict;

  return (
    <main className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
      <nav className="text-sm text-muted-foreground mb-4">
        <Link href="/wiki" className="hover:text-foreground">{dict.wiki.list_title}</Link>
        <span className="mx-2">›</span>
        <Link
          href={`/wiki/${encodeURIComponent(detail.slug)}`}
          className="hover:text-foreground"
        >
          {title}
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">{dict.wiki.history_button}</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight mb-6">
        {dict.wiki.history_heading.replace('{title}', title)}
      </h1>

        <WikiHistoryList
          pageId={detail.id}
          slug={detail.slug}
          items={history.items}
          total={history.total}
          page={history.page}
          totalPages={history.totalPages}
          expectedLatestRevisionId={detail.latestRevision.id}
        />
      </main>
  );
}
