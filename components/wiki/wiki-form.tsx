'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18/i18n-context';
import { slugifyEn, slugifyVi, checkSlug } from '@/lib/wiki/slug';

const TiptapEditor = dynamic(
  () => import('./editor/tiptap-editor').then((m) => m.TiptapEditor),
  { ssr: false, loading: () => <div className="border rounded p-4 text-gray-400">Loading editor…</div> },
);

export interface WikiFormValue {
  title: string;
  title_vi: string;
  slug: string;
  slug_vi: string;
  summary: string;
  summary_vi: string;
  content: string;
  content_vi: string;
  isPublished: boolean;
}

export const emptyWikiFormValue: WikiFormValue = {
  title: '', title_vi: '',
  slug: '', slug_vi: '',
  summary: '', summary_vi: '',
  content: '', content_vi: '',
  isPublished: false,
};

interface Props {
  initial: WikiFormValue;
  onSubmit: (value: WikiFormValue, mode: 'draft' | 'publish') => Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
  submitError?: string | null;
  // When editing, slugs are pre-filled from server; do not re-auto-generate from title.
  isEdit?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

function slugIssueKey(reason: string | undefined): string | null {
  if (!reason) return null;
  if (reason === 'reserved') return 'wiki.reserved_slug_error';
  if (reason === 'invalid' || reason === 'too_long' || reason === 'empty')
    return 'wiki.invalid_slug_error';
  return null;
}

export function WikiForm({
  initial,
  onSubmit,
  onCancel,
  saving = false,
  submitError = null,
  isEdit = false,
  onDirtyChange,
}: Props) {
  const { t } = useI18n();
  const [value, setValue] = useState<WikiFormValue>(initial);
  const [slugEnDirty, setSlugEnDirty] = useState(isEdit);
  const [slugViDirty, setSlugViDirty] = useState(isEdit);
  const [warnSame, setWarnSame] = useState(false);
  const initialRef = useRef(initial);

  useEffect(() => {
    const dirty = JSON.stringify(value) !== JSON.stringify(initialRef.current);
    onDirtyChange?.(dirty);
  }, [value, onDirtyChange]);

  // Auto slug generation: only when slug field hasn't been touched manually.
  useEffect(() => {
    if (slugEnDirty) return;
    setValue((v) => ({ ...v, slug: slugifyEn(v.title) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.title]);

  useEffect(() => {
    if (slugViDirty) return;
    setValue((v) => ({ ...v, slug_vi: slugifyVi(v.title_vi) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.title_vi]);

  // Beforeunload warning when dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const dirty = JSON.stringify(value) !== JSON.stringify(initialRef.current);
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [value]);

  const slugEnIssue = checkSlug(value.slug);
  const slugViIssue = checkSlug(value.slug_vi);
  const slugEnErr = slugIssueKey(slugEnIssue?.reason);
  const slugViErr = slugIssueKey(slugViIssue?.reason);

  const titlesFilled = value.title.trim().length > 0 && value.title_vi.trim().length > 0;
  const contentFilled = value.content.trim().length > 0 && value.content_vi.trim().length > 0;
  const canSubmitDraft = titlesFilled && !slugEnErr && !slugViErr && !saving;
  const canPublish = canSubmitDraft && contentFilled;

  const handlePublish = async () => {
    if (value.content.trim() === value.content_vi.trim() && contentFilled) {
      setWarnSame(true);
      return;
    }
    await onSubmit(value, 'publish');
  };

  const handlePublishConfirmed = async () => {
    setWarnSame(false);
    await onSubmit(value, 'publish');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('wiki.field_title_en')}</label>
          <input
            type="text"
            value={value.title}
            onChange={(e) => setValue((v) => ({ ...v, title: e.target.value }))}
            className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('wiki.field_title_vi')}</label>
          <input
            type="text"
            value={value.title_vi}
            onChange={(e) => setValue((v) => ({ ...v, title_vi: e.target.value }))}
            className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('wiki.field_slug_en')}</label>
          <input
            type="text"
            value={value.slug}
            onChange={(e) => { setSlugEnDirty(true); setValue((v) => ({ ...v, slug: e.target.value })); }}
            className={`w-full px-3 py-2 rounded border outline-none ${slugEnErr ? 'border-red-400' : 'border-gray-300 focus:border-blue-500'}`}
          />
          {slugEnErr && <p className="mt-1 text-xs text-red-600">{t(slugEnErr)}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('wiki.field_slug_vi')}</label>
          <input
            type="text"
            value={value.slug_vi}
            onChange={(e) => { setSlugViDirty(true); setValue((v) => ({ ...v, slug_vi: e.target.value })); }}
            className={`w-full px-3 py-2 rounded border outline-none ${slugViErr ? 'border-red-400' : 'border-gray-300 focus:border-blue-500'}`}
          />
          {slugViErr && <p className="mt-1 text-xs text-red-600">{t(slugViErr)}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('wiki.field_summary_en')}</label>
          <textarea
            value={value.summary}
            rows={2}
            onChange={(e) => setValue((v) => ({ ...v, summary: e.target.value }))}
            className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('wiki.field_summary_vi')}</label>
          <textarea
            value={value.summary_vi}
            rows={2}
            onChange={(e) => setValue((v) => ({ ...v, summary_vi: e.target.value }))}
            className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('wiki.field_content')}</label>
        <TiptapEditor
          value={{ en: value.content, vi: value.content_vi }}
          onChange={(next) => setValue((v) => ({ ...v, content: next.en, content_vi: next.vi }))}
        />
      </div>

      {submitError && (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 px-4 py-3">{submitError}</div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          disabled={!canSubmitDraft}
          onClick={() => onSubmit(value, 'draft')}
          className="px-4 py-2 rounded border bg-white hover:bg-gray-100 disabled:opacity-50"
        >
          {t('wiki.save_draft_button')}
        </button>
        <button
          type="button"
          disabled={!canPublish}
          onClick={handlePublish}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {t('wiki.save_publish_button')}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded border bg-white hover:bg-gray-100"
          >
            Cancel
          </button>
        )}
      </div>

      {warnSame && (
        <div className="rounded border border-yellow-300 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-900 mb-3">{t('wiki.publish_warn_same_content')}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePublishConfirmed}
              className="text-sm px-3 py-1 rounded bg-yellow-600 text-white hover:bg-yellow-700"
            >
              Publish anyway
            </button>
            <button
              type="button"
              onClick={() => setWarnSame(false)}
              className="text-sm px-3 py-1 rounded border bg-white hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
