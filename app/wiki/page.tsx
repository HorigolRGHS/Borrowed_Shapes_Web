import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchWikiList } from "@/lib/wiki/api";
import { WikiList } from "@/components/wiki/wiki-list";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { WikiListResponse } from "@/models/dtos/wiki.dto";

export const metadata: Metadata = { title: "Wiki" };
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
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } };
    errorMessage = e?.response?.data?.message ?? "Failed to load wiki list";
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Wiki</h1>
      </header>
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      {data && (
        <Suspense fallback={<WikiList.Skeleton />}>
          <WikiList
            data={data}
            basePath="/wiki"
            extraParams={q ? { q } : undefined}
          />
        </Suspense>
      )}
    </main>
  );
}
