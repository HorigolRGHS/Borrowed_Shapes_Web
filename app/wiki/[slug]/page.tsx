import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchWikiBySlug } from '@/lib/wiki/api';
import { WikiContentRenderer } from '@/components/wiki/wiki-content-renderer';
import { WikiToc } from '@/components/wiki/wiki-toc';

export const dynamic = 'force-dynamic';

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
        canonical: `/wiki/${detail.matchedSlugLocale === 'en' ? detail.slug : detail.slug_vi}`,
        languages: {
          en: `/wiki/${detail.slug}`,
          vi: `/wiki/${detail.slug_vi}`,
        },
      },
    };
  } catch {
    return { title: 'Wiki' };
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

  // Render content per requested locale: if URL slug matched English, prefer EN content.
  const isVi = detail.matchedSlugLocale === 'vi';
  const title = isVi ? detail.title_vi : detail.title;
  const content = isVi ? detail.latestRevision.content_vi : detail.latestRevision.content;
  const author = detail.latestRevision.author?.displayName ?? '—';
  const updated = new Date(detail.updatedAt);

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/wiki" className="hover:text-gray-900">Wiki</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-700">{title}</span>
      </nav>

      <div className="flex gap-8">
        <div className="flex-1 min-w-0">
          <header className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900">{title}</h1>
            <p className="mt-2 text-sm text-gray-500">
              {author} · {updated.toLocaleString()}
            </p>
          </header>

          <WikiContentRenderer markdown={content} />

          <div className="mt-8 pt-4 border-t border-gray-200">
            <Link
              href={`/wiki/${encodeURIComponent(slug)}/history`}
              className="text-sm text-blue-600 hover:underline"
            >
              View history →
            </Link>
          </div>
        </div>
        <WikiToc markdown={content} />
      </div>
    </main>
  );
}
