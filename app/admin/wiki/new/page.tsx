'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18/i18n-context';
import { createWiki } from '@/lib/wiki/api';
import { WikiForm, emptyWikiFormValue, type WikiFormValue } from '@/components/wiki/wiki-form';

export default function AdminWikiNewPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (value: WikiFormValue, mode: 'draft' | 'publish') => {
    setSaving(true);
    setError(null);
    try {
      const detail = await createWiki({
        slug: value.slug,
        slug_vi: value.slug_vi,
        title: value.title,
        title_vi: value.title_vi,
        content: value.content,
        content_vi: value.content_vi,
        summary: value.summary || undefined,
        summary_vi: value.summary_vi || undefined,
        isPublished: mode === 'publish',
      });
      router.push(`/admin/wiki/${detail.id}/edit`);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Create failed');
      setSaving(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">{t('wiki.create_button')}</h1>
      <WikiForm
        initial={emptyWikiFormValue}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/admin/wiki')}
        saving={saving}
        submitError={error}
      />
    </main>
  );
}
