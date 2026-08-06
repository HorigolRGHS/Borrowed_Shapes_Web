"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/lib/wiki/use-user-role";
import { toast } from "react-toastify";
import { rollbackWiki } from "@/lib/wiki/api";
import { getApiErrorMessage, type ApiError } from "@/lib/wiki/http";
import type { WikiHistoryItem } from "@/models/dtos/wiki.dto";
import { WikiPagination } from "./wiki-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  pageId: string;
  slug: string;
  items: WikiHistoryItem[];
  total: number;
  page: number;
  totalPages: number;
  expectedLatestRevisionId: string;
  isAdminRoute?: boolean;
}

export function WikiHistoryList({
  pageId,
  slug,
  items,
  total,
  page,
  totalPages,
  expectedLatestRevisionId,
  isAdminRoute = false,
}: Props) {
  const { t, locale } = useI18n();
  const role = useUserRole();
  const isAdmin = role === "ADMIN";
  const [busy, setBusy] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground">
        {t("wiki.no_history")}
      </p>
    );
  }

  const handleRollback = async (revisionId: string) => {
    setBusy(revisionId);
    try {
      await rollbackWiki(pageId, {
        targetRevisionId: revisionId,
        expectedLatestRevisionId,
      });
      toast.success(t("wiki.rollback_success"));
      window.location.href = `/wiki/${encodeURIComponent(slug)}`;
    } catch (err) {
      toast.error(getApiErrorMessage(err as ApiError, t("wiki.rollback_failed")));
    } finally {
      setBusy(null);
    }
  };

  const basePathHistory = isAdminRoute
    ? `/dashboard/wiki/${pageId}/history`
    : `/wiki/${encodeURIComponent(slug)}/history`;

  const getRevisionLink = (revisionId: string) =>
    isAdminRoute
      ? `/dashboard/wiki/${pageId}/history/${revisionId}`
      : `/wiki/${encodeURIComponent(slug)}/history/${revisionId}`;

  // Public routes show timeline for everyone. Dashboard routes show admin table.
  if (!isAdminRoute) {
    return (
      <div>
        <ol className="relative border-l border-border ml-2">
          {items.map((it) => {
            const summary = locale === "vi" ? it.summaryVi : it.summary;
            const created = new Date(it.createdAt).toLocaleString(locale);
            const author = it.author?.displayName ?? "—";
            return (
              <li key={it.id} className="mb-6 ml-6">
                <span
                  className={cn(
                    "absolute -left-1.75 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background",
                    it.isLatest ? "bg-primary" : "bg-muted-foreground/40",
                  )}
                  aria-hidden
                />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium text-foreground">{author}</span>
                  {it.isLatest && (
                    <Badge variant="secondary" className="text-xs">
                      {t("wiki.latest_badge")}
                    </Badge>
                  )}
                  <span className="font-mono text-xs text-muted-foreground">
                    {created}
                  </span>
                </div>
                {summary && (
                  <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
                )}
                <Link
                  href={getRevisionLink(it.id)}
                  className="mt-1 inline-block text-sm text-primary underline-offset-4 hover:underline"
                >
                  {t("wiki.view_button")}
                </Link>
              </li>
            );
          })}
        </ol>
        <WikiPagination
          page={page}
          totalPages={totalPages}
          basePath={basePathHistory}
        />
        <p className="text-sm text-muted-foreground mt-4 text-center">
          {t("wiki.revisions_count").replace("{count}", String(total))}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("wiki.col_date")}</TableHead>
              <TableHead>{t("wiki.col_author")}</TableHead>
              <TableHead>{t("wiki.col_summary")}</TableHead>
              <TableHead>{t("wiki.col_status")}</TableHead>
              <TableHead className="text-right">{t("wiki.col_actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => {
              const summary = locale === "vi" ? it.summaryVi : it.summary;
              const created = new Date(it.createdAt).toLocaleString(locale);
              const author = it.author?.displayName ?? "—";
              return (
                <TableRow key={it.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {created}
                  </TableCell>
                  <TableCell>{author}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {summary ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {it.isLatest && <Badge>{t("wiki.latest_badge")}</Badge>}
                  </TableCell>
                  <TableCell className="text-right space-x-2 whitespace-nowrap">
                    <Button asChild variant="outline" size="sm">
                      <Link href={getRevisionLink(it.id)}>
                        {t("wiki.view_button")}
                      </Link>
                    </Button>
                    {isAdmin && !it.isLatest && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy === it.id}
                            className="text-destructive hover:text-destructive"
                          >
                            {busy === it.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              t("wiki.rollback_button")
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t("wiki.confirm_rollback_title")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("wiki.confirm_rollback_message")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRollback(it.id)}
                            >
                              {t("wiki.rollback_button")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <WikiPagination
        page={page}
        totalPages={totalPages}
        basePath={basePathHistory}
      />
      <p className="text-sm text-muted-foreground mt-4 text-center">
        {t("wiki.revisions_count").replace("{count}", String(total))}
      </p>
    </div>
  );
}
