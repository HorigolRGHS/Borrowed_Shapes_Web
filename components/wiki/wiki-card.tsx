'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18/i18n-context';
import type { WikiListItem } from '@/models/dtos/wiki.dto';

interface Props {
  item: WikiListItem;
  showDraftBadge?: boolean;
  href?: string;
}

export function WikiCard({ item, showDraftBadge = false, href }: Props) {
  const { t, locale } = useI18n();
  const title = locale === 'vi' ? item.title_vi : item.title;
  const slug = locale === 'vi' ? item.slug_vi : item.slug;
  const summary = locale === 'vi' ? item.latestRevision?.summary_vi : item.latestRevision?.summary;
  const linkHref = href ?? `/wiki/${encodeURIComponent(slug)}`;

  return (
    <Link
      href={linkHref}
      className="block rounded-lg border border-gray-200 p-5 hover:border-blue-400 hover:shadow-md transition"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{title}</h3>
        {showDraftBadge && !item.isPublished && (
          <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 shrink-0">
            {t('wiki.draft_badge')}
          </span>
        )}
      </div>
      {summary && <p className="mt-2 text-sm text-gray-600 line-clamp-3">{summary}</p>}
      <div className="mt-3 text-xs text-gray-500">
        {item.latestRevision?.author?.displayName && (
          <span>{item.latestRevision.author.displayName} · </span>
        )}
        <span>{new Date(item.updatedAt).toLocaleDateString(locale)}</span>
      </div>
    </Link>
  );
}
