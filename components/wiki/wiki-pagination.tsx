"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Props {
  page: number;
  totalPages: number;
  basePath: string;
  extraParams?: Record<string, string>;
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i++) out.push(i);
  return out;
}

function buildHref(
  basePath: string,
  page: number,
  extraParams?: Record<string, string>,
): string {
  const sp = new URLSearchParams();
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      if (v !== undefined && v !== null && v !== "") sp.set(k, v);
    }
  }
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function WikiPagination({ page, totalPages, basePath, extraParams }: Props) {
  if (totalPages <= 1) return null;

  let pages: (number | "ellipsis")[] = [];
  if (totalPages <= 7) {
    pages = range(1, totalPages);
  } else if (page <= 4) {
    pages = [...range(1, 5), "ellipsis", totalPages];
  } else if (page >= totalPages - 3) {
    pages = [1, "ellipsis", ...range(totalPages - 4, totalPages)];
  } else {
    pages = [1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages];
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <Pagination className="mt-8">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={prevDisabled ? "#" : buildHref(basePath, page - 1, extraParams)}
            aria-disabled={prevDisabled}
            className={prevDisabled ? "pointer-events-none opacity-40" : ""}
          />
        </PaginationItem>
        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <PaginationItem key={`e-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
                href={buildHref(basePath, p, extraParams)}
                isActive={p === page}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext
            href={nextDisabled ? "#" : buildHref(basePath, page + 1, extraParams)}
            aria-disabled={nextDisabled}
            className={nextDisabled ? "pointer-events-none opacity-40" : ""}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
