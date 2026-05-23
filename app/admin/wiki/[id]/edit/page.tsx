'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18/i18n-context';
import {
  fetchAdminWikiById, updateWiki, publishWiki, unpublishWiki,
} from '@/lib/wiki/api';
import { WikiForm, type WikiFormValue } from '@/components/wiki/wiki-form';
import type { WikiDetail } from '@/models/dtos/wiki.dto';

interface ConflictLatest {
  id?: string;
  createdAt?: string;
}

export default function AdminWikiEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useI18n();
  const router = useRouter();
  const [detail, setDetail] = useState<WikiDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<null | { latest: ConflictLatest | null; pending: WikiFormValue; mode: 'draft' | 'publish' }>(null);
  const [pubBusy, setPubBusy] = useState(false);

  useEffect(() => {
    fetchAdminWikiById(id)
      .then(setDetail)
      .catch((e) => setLoadError(e?.response?.data?.message ?? 'Load failed'));
  }, [id]);

  if (loadError) {
    return <main className="p-8 text-red-700">{loadError}</main>;
  }
  if (!detail) {
    return <main className="p-8 text-gray-500">…</main>;
  }

  const initial: WikiFormValue = {
    title: detail.title,
    title_vi: detail.title_vi,
    slug: detail.slug,
    slug_vi: detail.slug_vi,
    summary: detail.latestRevision.summary ?? '',
    summary_vi: detail.latestRevision.summary_vi ?? '',
    content: detail.latestRevision.content,
    content_vi: detail.latestRevision.content_vi,
    isPublished: detail.isPublished,
  };

  const lastEditedBy = detail.latestRevision.author?.displayName ?? '—';
  const lastEditedAt = new Date(detail.latestRevision.createdAt).toLocaleString();

  const submit = async (value: WikiFormValue, mode: 'draft' | 'publish', force = false) => {
    setSaving(true);
    setSubmitError(null);
    try {
      const updated = await updateWiki(id, {
        slug: value.slug,
        slug_vi: value.slug_vi,
        title: value.title,
        title_vi: value.title_vi,
        content: value.content,
        content_vi: value.content_vi,
        summary: value.summary || undefined,
        summary_vi: value.summary_vi || undefined,
        isPublished: mode === 'publish',
        expectedLatestRevisionId: detail.latestRevision.id,
        forceOverwrite: force || undefined,
      });
      setDetail(updated);
      setConflict(null);
    } catch (e: any) {
      const status = e?.response?.status;
      const body = e?.response?.data;
      // Backend GlobalExceptionFilter strips ConflictException's currentLatest payload from the
      // standard envelope (data is always null), so trigger conflict UI on status 409 alone.
      // If a future filter passes currentLatest through, prefer that location; fall back to top-level.
      if (status === 409) {
        const latest: ConflictLatest | null =
          body?.data?.currentLatest ?? body?.currentLatest ?? null;
        setConflict({ latest, pending: value, mode });
      } else {
        setSubmitError(body?.message ?? 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    setPubBusy(true);
    try {
      const updated = detail.isPublished ? await unpublishWiki(id) : await publishWiki(id);
      setDetail(updated);
    } catch (e: any) {
      setSubmitError(e?.response?.data?.message ?? 'Publish toggle failed');
    } finally {
      setPubBusy(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('wiki.edit_button')}: {detail.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('wiki.edited_by').replace('{name}', lastEditedBy).replace('{date}', lastEditedAt)}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/wiki/${encodeURIComponent(detail.slug)}/history`}
            className="text-sm px-3 py-1 rounded border hover:bg-gray-100"
          >
            {t('wiki.history_button')}
          </Link>
          <button
            type="button"
            disabled={pubBusy}
            onClick={togglePublish}
            className="text-sm px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-50"
          >
            {detail.isPublished ? t('wiki.unpublish_button') : t('wiki.publish_button')}
          </button>
        </div>
      </header>

      <WikiForm
        initial={initial}
        onSubmit={(value, mode) => submit(value, mode)}
        onCancel={() => router.push('/admin/wiki')}
        saving={saving}
        submitError={submitError}
        isEdit
      />

      {conflict && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900">{t('wiki.conflict_title')}</h3>
            <p className="text-sm text-gray-700 mt-2">{t('wiki.conflict_message')}</p>
            {conflict.latest?.id && (
              <p className="text-xs text-gray-500 mt-2">
                Latest revision now: {conflict.latest.id.slice(0, 8)}…
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-3 py-1 rounded border hover:bg-gray-100"
              >
                {t('wiki.conflict_reload')}
              </button>
              <button
                type="button"
                onClick={() => submit(conflict.pending, conflict.mode, true)}
                className="px-3 py-1 rounded bg-orange-600 text-white hover:bg-orange-700"
              >
                {t('wiki.conflict_force')}
              </button>
              <button
                type="button"
                onClick={() => setConflict(null)}
                className="px-3 py-1 rounded border hover:bg-gray-100 ml-auto"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
