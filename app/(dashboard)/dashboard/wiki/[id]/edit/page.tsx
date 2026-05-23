"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18/i18n-context";
import {
  fetchAdminWikiById,
  updateWiki,
  publishWiki,
  unpublishWiki,
} from "@/lib/wiki/api";
import {
  WikiForm,
  type WikiFormValue,
} from "@/components/wiki/wiki-form";
import type { WikiDetail } from "@/models/dtos/wiki.dto";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [conflict, setConflict] = useState<null | {
    latest: ConflictLatest | null;
    pending: WikiFormValue;
    mode: "draft" | "publish";
  }>(null);
  const [pubBusy, setPubBusy] = useState(false);

  useEffect(() => {
    fetchAdminWikiById(id)
      .then(setDetail)
      .catch((e) => setLoadError(e?.response?.data?.message ?? "Load failed"));
  }, [id]);

  if (loadError) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </main>
    );
  }
  if (!detail) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  const initial: WikiFormValue = {
    title: detail.title,
    title_vi: detail.title_vi,
    slug: detail.slug,
    slug_vi: detail.slug_vi,
    summary: detail.latestRevision.summary ?? "",
    summary_vi: detail.latestRevision.summary_vi ?? "",
    content: detail.latestRevision.content,
    content_vi: detail.latestRevision.content_vi,
    isPublished: detail.isPublished,
  };

  const lastEditedBy = detail.latestRevision.author?.displayName ?? "—";
  const lastEditedAt = new Date(detail.latestRevision.createdAt).toLocaleString();

  const submit = async (
    value: WikiFormValue,
    mode: "draft" | "publish",
    force = false,
  ) => {
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
        isPublished: mode === "publish",
        expectedLatestRevisionId: detail.latestRevision.id,
        forceOverwrite: force || undefined,
      });
      setDetail(updated);
      setConflict(null);
    } catch (e: any) {
      const status = e?.response?.status;
      const body = e?.response?.data;
      if (status === 409) {
        const latest: ConflictLatest | null =
          body?.data?.currentLatest ?? body?.currentLatest ?? null;
        setConflict({ latest, pending: value, mode });
      } else {
        setSubmitError(body?.message ?? "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    setPubBusy(true);
    try {
      const updated = detail.isPublished
        ? await unpublishWiki(id)
        : await publishWiki(id);
      setDetail(updated);
    } catch (e: any) {
      setSubmitError(e?.response?.data?.message ?? "Publish toggle failed");
    } finally {
      setPubBusy(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <nav className="text-sm text-muted-foreground mb-4">
        <Link href="/dashboard/wiki" className="hover:text-foreground">
          Wiki
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">{detail.title}</span>
      </nav>

      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("wiki.edit_button")}: {detail.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("wiki.edited_by")
              .replace("{name}", lastEditedBy)
              .replace("{date}", lastEditedAt)}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button asChild variant="outline" size="sm">
            <Link href={`/wiki/${encodeURIComponent(detail.slug)}/history`}>
              {t("wiki.history_button")}
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pubBusy}
            onClick={togglePublish}
          >
            {detail.isPublished
              ? t("wiki.unpublish_button")
              : t("wiki.publish_button")}
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="pt-6">
          <WikiForm
            initial={initial}
            onSubmit={(value, mode) => submit(value, mode)}
            onCancel={() => router.push("/dashboard/wiki")}
            saving={saving}
            submitError={submitError}
            isEdit
          />
        </CardContent>
      </Card>

      <Dialog
        open={conflict !== null}
        onOpenChange={(open) => {
          if (!open) setConflict(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("wiki.conflict_title")}</DialogTitle>
            <DialogDescription>{t("wiki.conflict_message")}</DialogDescription>
          </DialogHeader>
          {conflict?.latest?.id && (
            <p className="text-xs text-muted-foreground font-mono">
              Latest revision now: {conflict.latest.id.slice(0, 8)}…
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.location.reload()}>
              {t("wiki.conflict_reload")}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                conflict && submit(conflict.pending, conflict.mode, true)
              }
            >
              {t("wiki.conflict_force")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
