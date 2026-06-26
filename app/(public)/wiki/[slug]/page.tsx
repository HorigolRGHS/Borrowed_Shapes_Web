import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { fetchWikiBySlug } from "@/lib/wiki/api";
import { WikiContentRenderer } from "@/components/wiki/wiki-content-renderer";
import { WikiToc } from "@/components/wiki/wiki-toc";
import { extractToc } from "@/lib/wiki/markdown-toc";
import { WikiInfobox } from "@/components/wiki/wiki-infobox";
import { WikiPageShell } from "@/components/wiki/wiki-page-shell";
import { WikiPageHeader } from "@/components/wiki/wiki-page-header";
import { fetchRelatedTitles } from "@/lib/wiki/related-api";
import {
  wikiMetadataSchema,
  emptyWikiMetadata,
  isWikiMetadataEmpty,
} from "@/models/dtos/wiki-metadata.dto";
import enDict from "@/locales/en.json";
import viDict from "@/locales/vi.json";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { WikiLocaleSync } from "@/components/wiki/wiki-locale-sync";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const detail = await fetchWikiBySlug(slug);
    return {
      title: detail.title,
      description: detail.latestRevision.summary ?? undefined,
      alternates: {
        canonical: `/wiki/${detail.matchedSlugLocale === "en" ? detail.slug : detail.slugVi}`,
        languages: {
          en: `/wiki/${detail.slug}`,
          vi: `/wiki/${detail.slugVi}`,
        },
      },
    };
  } catch {
    return { title: "Wiki" };
  }
}

export default async function WikiDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let detail;
  try {
    detail = await fetchWikiBySlug(slug);
  } catch (err: unknown) {
    const e = err as { response?: { status?: number } };
    if (e?.response?.status === 404) notFound();
    throw err;
  }

  const isVi = detail.matchedSlugLocale === "vi";
  const title = (isVi ? detail.titleVi : detail.title) || detail.title;
  const content =
    (isVi ? detail.latestRevision.contentVi : detail.latestRevision.content) ||
    detail.latestRevision.content ||
    "";
  const author = detail.latestRevision.author?.displayName ?? "—";
  const updated = new Date(detail.updatedAt);

  const cookieStore = await cookies();
  const uiLocale = cookieStore.get("NEXT_LOCALE")?.value === "vi" ? "vi" : "en";
  const dict = uiLocale === "vi" ? viDict : enDict;

  const merged = {
    ...emptyWikiMetadata,
    ...(typeof detail.metadataJson === "object" && detail.metadataJson !== null
      ? detail.metadataJson
      : {}),
  };
  const parsedMeta = wikiMetadataSchema.safeParse(merged);
  const hasInfobox = parsedMeta.success && !isWikiMetadataEmpty(parsedMeta.data);
  const hasToc = extractToc(content).length > 0;
  const relatedSlugs = parsedMeta.success ? parsedMeta.data.relatedPages : [];
  const relatedTitles =
    relatedSlugs.length > 0
      ? await fetchRelatedTitles(relatedSlugs)
      : undefined;

  const infoboxI18n = {
    infoboxLabel: dict.wiki.metadata.infobox_label,
    categoryLabel: dict.wiki.metadata.category_label,
    categoryName: (c: keyof typeof dict.wiki.metadata.category) =>
      dict.wiki.metadata.category[c],
    statsLabel: dict.wiki.metadata.stats,
    locationLabel:
      uiLocale === "vi"
        ? dict.wiki.metadata.location_vi
        : dict.wiki.metadata.location_en,
    relatedLabel: dict.wiki.metadata.related_pages,
    tagsLabel:
      uiLocale === "vi"
        ? dict.wiki.metadata.tags_vi
        : dict.wiki.metadata.tags_en,
  };

  return (
    <main className="container mx-auto px-4 py-8 pt-24 max-w-7xl">
      <nav className="text-sm text-muted-foreground mb-4">
        <Link href="/wiki" className="hover:text-foreground">
          Wiki
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">{title}</span>
      </nav>

      <WikiPageShell
        header={
          <WikiPageHeader
            mode="view"
            title={title}
            summary={
              isVi
                ? detail.latestRevision.summaryVi
                : detail.latestRevision.summary
            }
            isDraft={!detail.isPublished}
            byline={`${author} · ${updated.toLocaleString()}`}
          />
        }
        body={
          <>
            <WikiContentRenderer markdown={content} />
            <Separator className="my-8" />
            <Button asChild variant="link" className="px-0">
              <Link href={`/wiki/${encodeURIComponent(slug)}/history`}>
                {dict.wiki.view_history}
              </Link>
            </Button>
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
  );
}
