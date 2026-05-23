import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchWikiBySlug } from "@/lib/wiki/api";
import { WikiContentRenderer } from "@/components/wiki/wiki-content-renderer";
import { WikiToc } from "@/components/wiki/wiki-toc";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

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
        canonical: `/wiki/${detail.matchedSlugLocale === "en" ? detail.slug : detail.slug_vi}`,
        languages: {
          en: `/wiki/${detail.slug}`,
          vi: `/wiki/${detail.slug_vi}`,
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
  const title = isVi ? detail.title_vi : detail.title;
  const content = isVi
    ? detail.latestRevision.content_vi
    : detail.latestRevision.content;
  const author = detail.latestRevision.author?.displayName ?? "—";
  const updated = new Date(detail.updatedAt);

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <nav className="text-sm text-muted-foreground mb-4">
        <Link href="/wiki" className="hover:text-foreground">
          Wiki
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">{title}</span>
      </nav>

      <div className="flex gap-8">
        <div className="flex-1 min-w-0">
          <header className="mb-6 space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
              {!detail.isPublished && (
                <Badge variant="secondary">Draft</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {author} · {updated.toLocaleString()}
            </p>
          </header>

          <WikiContentRenderer markdown={content} />

          <Separator className="my-8" />
          <Button asChild variant="link" className="px-0">
            <Link href={`/wiki/${encodeURIComponent(slug)}/history`}>
              View history →
            </Link>
          </Button>
        </div>
        <WikiToc markdown={content} />
      </div>
    </main>
  );
}
