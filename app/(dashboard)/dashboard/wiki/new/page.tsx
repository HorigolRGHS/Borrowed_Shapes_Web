"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18/i18n-context";
import { createWiki } from "@/lib/wiki/api";
import {
  WikiForm,
  emptyWikiFormValue,
  type WikiFormValue,
} from "@/components/wiki/wiki-form";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminWikiNewPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    value: WikiFormValue,
    mode: "draft" | "publish",
  ) => {
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
        isPublished: mode === "publish",
      });
      router.push(`/dashboard/wiki/${detail.id}/edit`);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Create failed");
      setSaving(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <nav className="text-sm text-muted-foreground mb-4">
        <Link href="/dashboard/wiki" className="hover:text-foreground">
          Wiki
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">New</span>
      </nav>
      <h1 className="text-2xl font-bold tracking-tight mb-6">
        {t("wiki.create_button")}
      </h1>
      <Card>
        <CardContent className="pt-6">
          <WikiForm
            initial={emptyWikiFormValue}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/dashboard/wiki")}
            saving={saving}
            submitError={error}
          />
        </CardContent>
      </Card>
    </main>
  );
}
