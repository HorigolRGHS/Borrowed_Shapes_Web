'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useI18n } from '@/lib/i18/i18n-context';
import { useUserRole } from '@/lib/wiki/use-user-role';
import { rollbackWiki } from '@/lib/wiki/api';
import type { WikiHistoryItem } from '@/models/dtos/wiki.dto';
import { WikiPagination } from './wiki-pagination';

interface Props {
  pageId: string;
  slug: string;
  items: WikiHistoryItem[];
  total: number;
  page: number;
  totalPages: number;
  expectedLatestRevisionId: string;
}

export function WikiHistoryList({
  pageId, slug, items, total, page, totalPages, expectedLatestRevisionId,
}: Props) {
  const { t, locale } = useI18n();
  const role = useUserRole();
  const isAdmin = role === 'ADMIN';
  const [busy, setBusy] = useState<string | null>(null);

  if (items.length === 0) {
    return <div className="py-16 text-center text-gray-500">{t('wiki.no_history')}</div>;
  }

  const handleRollback = async (revisionId: string) => {
    if (!confirm(t('wiki.confirm_rollback_message'))) return;
    setBusy(revisionId);
    try {
      await rollbackWiki(pageId, {
        targetRevisionId: revisionId,
        expectedLatestRevisionId,
      });
      window.location.href = `/wiki/${encodeURIComponent(slug)}`;
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Rollback failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {items.map((it) => {
          const summary = locale === 'vi' ? it.summary_vi : it.summary;
          const created = new Date(it.createdAt).toLocaleString(locale);
          const author = it.author?.displayName ?? '—';
          return (
            <li key={it.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-gray-500">{created} · {author}</div>
                {summary && <div className="mt-1 text-gray-900">{summary}</div>}
                {it.isLatest && (
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    Latest
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link
                  href={`/wiki/${encodeURIComponent(slug)}/history/${it.id}`}
                  className="text-sm px-3 py-1 rounded border hover:bg-gray-100"
                >
                  {t('wiki.view_button')}
                </Link>
                {isAdmin && !it.isLatest && (
                  <button
                    type="button"
                    disabled={busy === it.id}
                    onClick={() => handleRollback(it.id)}
                    className="text-sm px-3 py-1 rounded border border-orange-300 text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                  >
                    {busy === it.id ? '…' : t('wiki.rollback_button')}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <WikiPagination
        page={page}
        totalPages={totalPages}
        basePath={`/wiki/${encodeURIComponent(slug)}/history`}
      />
      <p className="text-sm text-gray-500 mt-4 text-center">
        {total} revisions
      </p>
    </div>
  );
}
