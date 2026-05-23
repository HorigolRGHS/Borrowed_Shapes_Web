'use client';

import { useI18n } from '@/lib/i18/i18n-context';
import type { WikiListResponse } from '@/models/dtos/wiki.dto';
import { WikiCard } from './wiki-card';
import { WikiPagination } from './wiki-pagination';

interface Props {
  data: WikiListResponse;
  basePath: string;
  extraParams?: Record<string, string>;
  showDraftBadge?: boolean;
  emptyMessageKey?: string;
}

export function WikiList({
  data,
  basePath,
  extraParams,
  showDraftBadge = false,
  emptyMessageKey = 'wiki.empty_list',
}: Props) {
  const { t } = useI18n();

  if (data.items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">{t(emptyMessageKey)}</div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.items.map((item) => (
          <WikiCard
            key={item.id}
            item={item}
            showDraftBadge={showDraftBadge}
          />
        ))}
      </div>
      <WikiPagination
        page={data.page}
        totalPages={data.totalPages}
        basePath={basePath}
        extraParams={extraParams}
      />
    </>
  );
}
