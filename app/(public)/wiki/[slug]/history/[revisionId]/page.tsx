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
import { WikiToc } from '@/components/wiki/wiki-toc';
import { WikiInfobox } from '@/components/wiki/wiki-infobox';
import { WikiPageShell } from '@/components/wiki/wiki-page-shell';
import { WikiPageHeader } from '@/components/wiki/wiki-page-header';
import { WikiLocaleSync } from '@/components/wiki/wiki-locale-sync';
import { extractToc } from '@/lib/wiki/markdown-toc';
import { fetchRelatedTitles } from '@/lib/wiki/related-api';
import {
  wikiMetadataSchema,
  emptyWikiMetadata,
  isWikiMetadataEmpty,
} from '@/models/dtos/wiki-metadata.dto';
import { Separator } from '@/components/ui/separator';
import { decodeJwt, normalizeJwt } from '@/lib/utils/jwt';
import enDict from '@/locales/en.json';
import viDict from '@/locales/vi.json';

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
  } catch (err: unknown) {
    const e = err as { response?: { status?: number } };
    if (e?.response?.status === 404) notFound();
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
  } catch (err: unknown) {
    const e = err as { response?: { status?: number } };
    if (e?.response?.status === 404) notFound();
    throw err;
  }

  const uiLocale = cookieStore.get('NEXT_LOCALE')?.value === 'vi' ? 'vi' : 'en';
  const dict = uiLocale === 'vi' ? viDict : enDict;
  const isVi = uiLocale === 'vi';

  const title = detail.title;
  const content =
    (isVi ? revision.contentVi : revision.content) || revision.content || '';
  const summary = isVi ? revision.summaryVi : revision.summary;
  const author = revision.author?.displayName ?? '—';
  const created = new Date(revision.createdAt).toLocaleString(uiLocale);

  const merged = {
    ...emptyWikiMetadata,
    ...(typeof detail.metadataJson === 'object' && detail.metadataJson !== null
      ? detail.metadataJson
      : {}),
  };
  const parsedMeta = wikiMetadataSchema.safeParse(merged);
  const hasInfobox = parsedMeta.success && !isWikiMetadataEmpty(parsedMeta.data);
  const hasToc = extractToc(content).length > 0;
  const relatedSlugs = parsedMeta.success ? parsedMeta.data.relatedPages : [];
  const relatedTitles =
    relatedSlugs.length > 0 ? await fetchRelatedTitles(relatedSlugs) : undefined;

  const infoboxI18n = {
    infoboxLabel: dict.wiki.metadata.infobox_label,
    categoryLabel: dict.wiki.metadata.category_label,
    categoryName: (c: keyof typeof dict.wiki.metadata.category) =>
      dict.wiki.metadata.category[c],
    statsLabel: dict.wiki.metadata.stats,
    locationLabel: isVi
      ? dict.wiki.metadata.location_vi
      : dict.wiki.metadata.location_en,
    relatedLabel: dict.wiki.metadata.related_pages,
    tagsLabel: isVi ? dict.wiki.metadata.tags_vi : dict.wiki.metadata.tags_en,
  };

  return (
    <>
      <WikiLocaleSync slug={detail.slug} slugVi={detail.slugVi} pathSuffix={`/history/${revisionId}`} />
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

        <WikiPageShell
          header={
            <WikiPageHeader
              mode="view"
              title={title}
              summary={summary}
              byline={`${dict.wiki.revision_at.replace('{date}', created)} · ${dict.wiki.by_author.replace('{name}', author)}`}
            />
          }
          body={
            <>
              <WikiContentRenderer markdown={content} />
            </>
          }
          infobox={
            hasInfobox ? (
              <WikiInfobox
                metadata={detail.metadataJson}
                title={title}
                locale={uiLocale}
                relatedTitles={relatedTitles}
                i18n={infoboxI18n}
              />
            ) : undefined
          }
          toc={hasToc ? <WikiToc markdown={content} /> : undefined}
        />
      </main>
    </>
  );
}
