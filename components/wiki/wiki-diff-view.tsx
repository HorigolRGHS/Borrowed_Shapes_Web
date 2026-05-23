'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18/i18n-context';
import { collapseEqualRuns } from '@/lib/wiki/markdown-diff';
import type { WikiDiffChunk } from '@/models/dtos/wiki.dto';

interface Props {
  diff: { en: WikiDiffChunk[]; vi: WikiDiffChunk[] } | null;
  isFirst: boolean;
}

export function WikiDiffView({ diff, isFirst }: Props) {
  const { t } = useI18n();
  const [tab, setTab] = useState<'en' | 'vi'>('en');

  if (isFirst || !diff) {
    return (
      <div className="p-6 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-center">
        {t('wiki.no_previous_revision')}
      </div>
    );
  }

  const chunks = collapseEqualRuns(tab === 'en' ? diff.en : diff.vi, 10);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => setTab('en')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'en' ? 'bg-white border-b-2 border-blue-500 text-blue-700' : 'text-gray-600'}`}
        >
          {t('wiki.tab_en')}
        </button>
        <button
          type="button"
          onClick={() => setTab('vi')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'vi' ? 'bg-white border-b-2 border-blue-500 text-blue-700' : 'text-gray-600'}`}
        >
          {t('wiki.tab_vi')}
        </button>
      </div>
      <pre className="p-4 text-xs leading-5 font-mono whitespace-pre-wrap overflow-x-auto bg-white">
        {chunks.map((c, i) => {
          const cls =
            c.type === 'add' ? 'bg-green-100 text-green-900'
            : c.type === 'remove' ? 'bg-red-100 text-red-900 line-through'
            : 'text-gray-700';
          const prefix = c.type === 'add' ? '+ ' : c.type === 'remove' ? '- ' : '  ';
          return (
            <span key={i} className={`block px-2 py-0.5 ${cls}`}>
              {prefix}{c.value}
            </span>
          );
        })}
      </pre>
    </div>
  );
}
