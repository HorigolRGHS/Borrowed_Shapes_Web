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
import { WikiLocaleSync } from '@/components/wiki/wiki-locale-sync';
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  const isAdmin = normalized.role === 'ADMIN';

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
    if (isAdmin) {
      [revision, diff] = await Promise.all([
        fetchWikiRevision(detail.id, revisionId),
        fetchWikiRevisionDiff(detail.id, revisionId),
      ]);
    } else {
      revision = await fetchWikiRevision(detail.id, revisionId);
    }
  } catch (err: any) {
    if (err?.response?.status === 404) notFound();
    throw err;
  }

  const title = detail.matchedSlugLocale === 'vi' ? detail.titleVi : detail.title;
  const author = revision.author?.displayName ?? '—';
  const created = new Date(revision.createdAt).toLocaleString();

  return (
    <>
      <WikiLocaleSync slug={detail.slug} slugVi={detail.slugVi} currentPath={`/history/${revisionId}`} />
      <main className="container mx-auto px-4 py-8 pt-24 max-w-5xl">
      <nav className="text-sm text-muted-foreground mb-4">
        <Link href="/wiki" className="hover:text-foreground">Wiki</Link>
        <span className="mx-2">›</span>
        <Link
          href={`/wiki/${encodeURIComponent(slug)}`}
          className="hover:text-foreground"
        >
          {title}
        </Link>
        <span className="mx-2">›</span>
        <Link
          href={`/wiki/${encodeURIComponent(slug)}/history`}
          className="hover:text-foreground"
        >
          History
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">{revisionId.slice(0, 8)}…</span>
      </nav>

      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Revision @ {created}
        </h1>
        <p className="text-sm text-muted-foreground">By {author}</p>
        {revision.summary && (
          <p className="text-foreground">{revision.summary}</p>
        )}
      </header>

      {isAdmin && diff && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Diff vs previous</h2>
          <WikiDiffView diff={diff.diff} isFirst={diff.isFirst} />
        </section>
      )}

      <section className="space-y-6">
        <h2 className="text-lg font-semibold">Content snapshot</h2>
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div>
              <h3 className="text-xs uppercase text-muted-foreground mb-2">
                English
              </h3>
              <WikiContentRenderer markdown={revision.content} />
            </div>
            <Separator />
            <div>
              <h3 className="text-xs uppercase text-muted-foreground mb-2">
                Tiếng Việt
              </h3>
              <WikiContentRenderer markdown={revision.contentVi} />
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
    </>
  );
}
