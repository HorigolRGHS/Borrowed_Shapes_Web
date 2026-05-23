import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  fetchWikiBySlug,
  fetchWikiRevision,
  fetchWikiRevisionDiff,
} from '@/lib/wiki/api';
import { WikiDiffView } from '@/components/wiki/wiki-diff-view';
import { WikiContentRenderer } from '@/components/wiki/wiki-content-renderer';
import { decodeJwt, normalizeJwt } from '@/lib/utils/jwt';

export const dynamic = 'force-dynamic';

export default async function WikiRevisionPage({
  params,
}: {
  params: Promise<{ slug: string; revisionId: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  const decoded = token ? decodeJwt(token) : null;
  const normalized = decoded ? normalizeJwt(decoded) : null;
  if (!normalized) {
    const { slug, revisionId } = await params;
    redirect(`/auth/login?from=/wiki/${encodeURIComponent(slug)}/history/${revisionId}`);
  }

  const { slug, revisionId } = await params;
  let detail;
  try {
    detail = await fetchWikiBySlug(slug);
  } catch (err: any) {
    if (err?.response?.status === 404) notFound();
    throw err;
  }

  let revision;
  let diff;
  try {
    [revision, diff] = await Promise.all([
      fetchWikiRevision(detail.id, revisionId),
      fetchWikiRevisionDiff(detail.id, revisionId),
    ]);
  } catch (err: any) {
    if (err?.response?.status === 404) notFound();
    throw err;
  }

  const title = detail.matchedSlugLocale === 'vi' ? detail.title_vi : detail.title;
  const author = revision.author?.displayName ?? '—';
  const created = new Date(revision.createdAt).toLocaleString();

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/wiki" className="hover:text-gray-900">Wiki</Link>
        <span className="mx-2">›</span>
        <Link href={`/wiki/${encodeURIComponent(slug)}`} className="hover:text-gray-900">{title}</Link>
        <span className="mx-2">›</span>
        <Link href={`/wiki/${encodeURIComponent(slug)}/history`} className="hover:text-gray-900">History</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-700">{revisionId.slice(0, 8)}…</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold">Revision @ {created}</h1>
        <p className="mt-1 text-sm text-gray-500">By {author}</p>
        {revision.summary && <p className="mt-2 text-gray-700">{revision.summary}</p>}
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Diff vs previous</h2>
        <WikiDiffView diff={diff.diff} isFirst={diff.isFirst} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Content snapshot</h2>
        <div className="border border-gray-200 rounded-lg p-6 bg-white">
          <h3 className="text-sm uppercase text-gray-500 mb-2">English</h3>
          <WikiContentRenderer markdown={revision.content} />
          <hr className="my-6 border-gray-200" />
          <h3 className="text-sm uppercase text-gray-500 mb-2">Tiếng Việt</h3>
          <WikiContentRenderer markdown={revision.content_vi} />
        </div>
      </section>
    </main>
  );
}
