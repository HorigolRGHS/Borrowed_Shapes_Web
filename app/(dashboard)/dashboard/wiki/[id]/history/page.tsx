import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { fetchAdminWikiById, fetchWikiHistory } from '@/lib/wiki/api';
import { WikiHistoryList } from '@/components/wiki/wiki-history-list';
import { decodeJwt, normalizeJwt } from '@/lib/utils/jwt';
import { getApiErrorStatus, type ApiError } from '@/lib/wiki/http';

export const dynamic = 'force-dynamic';

export default async function AdminWikiHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  const decoded = token ? decodeJwt(token) : null;
  const normalized = decoded ? normalizeJwt(decoded) : null;

  if (!normalized || normalized.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const { id } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  let detail;
  try {
    detail = await fetchAdminWikiById(id);
  } catch (err) {
    if (getApiErrorStatus(err as ApiError) === 404) notFound();
    throw err;
  }

  const history = await fetchWikiHistory(detail.id, page, 20);
  const title = detail.titleVi || detail.title;

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <nav className="text-sm text-muted-foreground mb-4">
        <Link href="/dashboard/wiki" className="hover:text-foreground">Wiki Admin</Link>
        <span className="mx-2">›</span>
        <Link
          href={`/dashboard/wiki/${id}/edit`}
          className="hover:text-foreground"
        >
          {title}
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">History</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight mb-6">History — {title}</h1>

      <WikiHistoryList
        pageId={detail.id}
        slug={detail.slug}
        items={history.items}
        total={history.total}
        page={history.page}
        totalPages={history.totalPages}
        expectedLatestRevisionId={detail.latestRevision.id}
        isAdminRoute
      />
    </main>
  );
}
