'use client';

import Link from 'next/link';

interface Props {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i++) out.push(i);
  return out;
}

export function WikiPagination({ page, totalPages, buildHref }: Props) {
  if (totalPages <= 1) return null;

  // Show up to 7 buttons with ellipsis: 1 ... p-1 p p+1 ... last
  let pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    pages = range(1, totalPages);
  } else if (page <= 4) {
    pages = [...range(1, 5), 'ellipsis', totalPages];
  } else if (page >= totalPages - 3) {
    pages = [1, 'ellipsis', ...range(totalPages - 4, totalPages)];
  } else {
    pages = [1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages];
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav className="flex items-center gap-2 justify-center mt-8" aria-label="Pagination">
      <Link
        href={prevDisabled ? '#' : buildHref(page - 1)}
        aria-disabled={prevDisabled}
        className={`px-3 py-1 rounded border ${prevDisabled ? 'opacity-40 pointer-events-none' : 'hover:bg-gray-100'}`}
      >
        ‹
      </Link>
      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e-${i}`} className="px-2 text-gray-400">…</span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            className={`px-3 py-1 rounded border ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-100'}`}
          >
            {p}
          </Link>
        ),
      )}
      <Link
        href={nextDisabled ? '#' : buildHref(page + 1)}
        aria-disabled={nextDisabled}
        className={`px-3 py-1 rounded border ${nextDisabled ? 'opacity-40 pointer-events-none' : 'hover:bg-gray-100'}`}
      >
        ›
      </Link>
    </nav>
  );
}
