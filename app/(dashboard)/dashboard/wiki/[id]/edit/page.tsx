"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import { useI18n } from "@/lib/i18/i18n-context";
import { fetchAdminWikiById, updateWiki } from "@/lib/wiki/api";
import {
  WikiForm,
  type WikiFormValue,
} from "@/components/wiki/wiki-form";
import type { WikiDetail } from "@/models/dtos/wiki.dto";
import { normalizeWikiFormMetadata } from "@/models/dtos/wiki-metadata.dto";
import { getApiErrorMessage, type ApiError, type ConflictLatest } from "@/lib/wiki/http";
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

export default function AdminWikiEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, locale } = useI18n();
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

  useEffect(() => {
    fetchAdminWikiById(id)
      .then(setDetail)
      .catch((e) => setLoadError(getApiErrorMessage(e as ApiError, "Load failed")));
  }, [id]);

  if (loadError) {
    return (
      <main className="container mx-auto">
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </main>
    );
  }
  if (!detail) {
    return (
      <main className="container mx-auto space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  const initial: WikiFormValue = {
    title: detail.title,
    titleVi: detail.titleVi,
    slug: detail.slug,
    slugVi: detail.slugVi,
    summary: detail.latestRevision.summary ?? "",
    summaryVi: detail.latestRevision.summaryVi ?? "",
    content: detail.latestRevision.content,
    contentVi: detail.latestRevision.contentVi,
    isPublished: detail.isPublished,
    metadata: normalizeWikiFormMetadata(detail.metadataJson),
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
        slugVi: value.slugVi,
        title: value.title,
        titleVi: value.titleVi,
        content: value.content,
        contentVi: value.contentVi,
        summary: value.summary || undefined,
        summaryVi: value.summaryVi || undefined,
        metadataJson: value.metadata,
        isPublished: mode === "publish",
        expectedLatestRevisionId: detail.latestRevision.id,
        forceOverwrite: force || undefined,
      });
      setDetail(updated);
      setConflict(null);
      toast.success(
        mode === "publish"
          ? t("wiki.edit.save_publish_success")
          : t("wiki.edit.save_draft_success"),
      );
      return { ok: true };
    } catch (e) {
      const err = e as ApiError;
      const status = err.response?.status;
      const body = err.response?.data;
      if (status === 409) {
        const latest: ConflictLatest | null =
          body?.data?.currentLatest ?? body?.currentLatest ?? null;
        setConflict({ latest, pending: value, mode });
      } else {
        const msg = body?.message ?? "Save failed";
        setSubmitError(msg);
        toast.error(msg);
      }
      return { ok: false };
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="container mx-auto py-8">
      <nav className="text-sm text-muted-foreground mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0 truncate">
          <Link href="/dashboard/wiki" className="hover:text-foreground">
            Wiki
          </Link>
          <span className="mx-2">›</span>
          <span className="text-foreground">{detail.title}</span>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={`/wiki/${encodeURIComponent(detail.slug)}/history`}>
            {t("wiki.history_button")}
          </Link>
        </Button>
      </nav>

      <WikiForm
        wikiId={detail.id}
        initial={initial}
        onSubmit={(value, mode) => submit(value, mode)}
        onCancel={() => router.push("/dashboard/wiki")}
        saving={saving}
        submitError={submitError}
        isEdit
        locale={locale}
        excludeSlug={detail.slug}
        headerSubtitle={t("wiki.edited_by")
          .replace("{name}", lastEditedBy)
          .replace("{date}", lastEditedAt)}
      />

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
