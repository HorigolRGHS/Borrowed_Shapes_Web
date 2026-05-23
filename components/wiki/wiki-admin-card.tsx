'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useI18n } from '@/lib/i18/i18n-context';
import { deleteWiki } from '@/lib/wiki/api';
import type { WikiListItem } from '@/models/dtos/wiki.dto';

interface Props {
  item: WikiListItem;
  onDeleted?: (id: string) => void;
}

export function WikiAdminCard({ item, onDeleted }: Props) {
  const { t, locale } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const title = locale === 'vi' ? item.title_vi : item.title;
  const slug = locale === 'vi' ? item.slug_vi : item.slug;

  const expectedSlug = item.slug;

  const handleDelete = async () => {
    if (confirmInput !== expectedSlug) {
      setErr(t('wiki.confirm_delete_input_hint').replace('{slug}', expectedSlug));
      return;
    }
    setDeleting(true);
    try {
      await deleteWiki(item.id);
      onDeleted?.(item.id);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Delete failed');
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-5 bg-white">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{title}</h3>
        {!item.isPublished && (
          <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 shrink-0">
            {t('wiki.draft_badge')}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-3">
        {item.slug} · {new Date(item.updatedAt).toLocaleDateString(locale)}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/wiki/${encodeURIComponent(slug)}`}
          className="text-sm px-3 py-1 rounded border hover:bg-gray-100"
        >
          {t('wiki.view_button')}
        </Link>
        <Link
          href={`/dashboard/wiki/${item.id}/edit`}
          className="text-sm px-3 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50"
        >
          {t('wiki.edit_button')}
        </Link>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-sm px-3 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50"
        >
          {t('wiki.delete_button')}
        </button>
      </div>

      {confirming && (
        <div className="mt-4 p-4 rounded bg-red-50 border border-red-200">
          <p className="text-sm text-red-900 font-medium mb-1">{t('wiki.confirm_delete_title')}</p>
          <p className="text-sm text-red-800 mb-2">{t('wiki.confirm_delete_message')}</p>
          <p className="text-xs text-red-700 mb-2">
            {t('wiki.confirm_delete_input_hint').replace('{slug}', expectedSlug)}
          </p>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            disabled={deleting}
            className="w-full px-3 py-1 text-sm rounded border border-red-300"
            placeholder={expectedSlug}
          />
          {err && <p className="mt-2 text-xs text-red-700">{err}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={deleting || confirmInput !== expectedSlug}
              onClick={handleDelete}
              className="text-sm px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? '…' : t('wiki.delete_button')}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => { setConfirming(false); setConfirmInput(''); setErr(null); }}
              className="text-sm px-3 py-1 rounded border hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
