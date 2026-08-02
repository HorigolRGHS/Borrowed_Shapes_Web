import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchWikiList } from "@/lib/wiki/api";
import { WikiPublicList, WikiPublicListSkeleton } from "@/components/wiki/wiki-public-list";
import type { WikiListResponse } from "@/models/dtos/wiki.dto";
import { getApiErrorMessage, type ApiError } from "@/lib/wiki/http";

export const metadata: Metadata = { title: "Wiki | Borrowed Shapes" };
export const dynamic = "force-dynamic";

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
  } catch (err) {
    errorMessage = getApiErrorMessage(err as ApiError, "load_failed");
  }

  return (
    <main className="min-h-screen bg-background px-4 pb-16 pt-24 text-foreground dark:bg-[#060711] dark:text-white">
      <section className="mx-auto max-w-6xl">
        <Suspense fallback={<WikiPublicListSkeleton />}>
          <WikiPublicList
            data={data}
            basePath="/wiki"
            extraParams={q ? { q } : undefined}
            query={q}
            errorMessage={errorMessage}
          />
        </Suspense>
      </section>
    </main>
  );
}
