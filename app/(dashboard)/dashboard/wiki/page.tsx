import { Suspense } from 'react';
import { AdminWikiListClient } from './admin-wiki-list-client';

export const metadata = { title: 'Wiki Admin' };

export default function AdminWikiListPage() {
  return (
    <Suspense fallback={<main className="p-8">…</main>}>
      <AdminWikiListClient />
    </Suspense>
  );
}
