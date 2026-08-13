import { redirect } from "next/navigation";
import { searchWiki } from "@/lib/wiki/api";
import { getApiErrorMessage, type ApiError } from "@/lib/wiki/http";
import { WikiList } from "@/components/wiki/wiki-list";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { WikiPublicListResponse } from "@/models/dtos/wiki.dto";

export const dynamic = "force-dynamic";

export default async function WikiSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  if (!q) redirect("/wiki");
  const page = Math.max(1, Number(params.page) || 1);

  let data: WikiPublicListResponse | undefined;
  let errorMessage: string | null = null;
  try {
    data = await searchWiki(q, page, 20);
  } catch (err) {
    errorMessage = getApiErrorMessage(err as ApiError, "Search failed");
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Search results for &ldquo;{q}&rdquo;
        </h1>
        {data && (
          <p className="text-sm text-muted-foreground">{data.total} results</p>
        )}
      </header>
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      {data && (
        <WikiList
          data={data}
          emptyMessageKey="wiki.search_no_results"
          basePath="/wiki/search"
          extraParams={{ q }}
        />
      )}
    </main>
  );
}
