"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, History, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { fetchAdminWikiList, deleteWiki } from "@/lib/wiki/api";
import type { WikiListResponse, WikiListItem } from "@/models/dtos/wiki.dto";
import { WikiPagination } from "@/components/wiki/wiki-pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type FilterMode = "all" | "published" | "draft";

export function AdminWikiListClient() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const filter: FilterMode = (sp.get("filter") as FilterMode) ?? "all";

  const [data, setData] = useState<WikiListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<WikiListItem | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminWikiList({ page, limit: 20 });
      let items = result.items;
      if (filter === "published") items = items.filter((i) => i.isPublished);
      if (filter === "draft") items = items.filter((i) => !i.isPublished);
      setData({ ...result, items });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Load failed");
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFilter = (next: FilterMode) => {
    const params = new URLSearchParams();
    if (next !== "all") params.set("filter", next);
    router.push(`/dashboard/wiki${params.toString() ? "?" + params : ""}`);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    if (confirmInput !== pendingDelete.slug) {
      setDeleteError(
        t("wiki.confirm_delete_input_hint").replace("{slug}", pendingDelete.slug),
      );
      return;
    }
    setDeleting(true);
    try {
      await deleteWiki(pendingDelete.id);
      if (data) {
        setData({
          ...data,
          items: data.items.filter((i) => i.id !== pendingDelete.id),
          total: Math.max(0, data.total - 1),
        });
      }
      setPendingDelete(null);
      setConfirmInput("");
      setDeleteError(null);
    } catch (e: any) {
      setDeleteError(e?.response?.data?.message ?? "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("wiki.admin_title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("wiki.list_subtitle")}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/wiki/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("wiki.create_button")}
          </Link>
        </Button>
      </header>

      <div className="mb-4 flex gap-2 items-center">
        <Select value={filter} onValueChange={(v) => handleFilter(v as FilterMode)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("wiki.filter_all")}</SelectItem>
            <SelectItem value="published">{t("wiki.published_badge")}</SelectItem>
            <SelectItem value="draft">{t("wiki.draft_badge")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("wiki.col_title")}</TableHead>
              <TableHead>{t("wiki.col_status")}</TableHead>
              <TableHead>{t("wiki.col_updated")}</TableHead>
              <TableHead className="w-[80px] text-right">{t("wiki.col_actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`s-${i}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/3" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            {!loading && data && data.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    {t("wiki.empty_list")}
                  </p>
                  <Button asChild size="sm">
                    <Link href="/dashboard/wiki/new">
                      <Plus className="mr-2 h-4 w-4" />
                      {t("wiki.create_button")}
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              data?.items.map((item) => {
                const title = locale === "vi" ? item.titleVi : item.title;
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{title}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {item.slug}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.isPublished ? (
                        <Badge>{t("wiki.published_badge")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("wiki.draft_badge")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(item.updatedAt).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("wiki.actions_menu_label")}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/wiki/${encodeURIComponent(
                                locale === "vi" ? item.slugVi : item.slug,
                              )}`}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              {t("wiki.view_button")}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/wiki/${item.id}/edit`}
                              className="gap-2"
                            >
                              <Pencil className="h-4 w-4" />
                              {t("wiki.edit_button")}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/wiki/${encodeURIComponent(item.slug)}/history`}
                              className="gap-2"
                            >
                              <History className="h-4 w-4" />
                              {t("wiki.history_button")}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 text-destructive focus:text-destructive"
                            onClick={() => {
                              setPendingDelete(item);
                              setConfirmInput("");
                              setDeleteError(null);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            {t("wiki.delete_button")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {data && (
        <WikiPagination
          page={data.page}
          totalPages={data.totalPages}
          basePath="/dashboard/wiki"
          extraParams={filter !== "all" ? { filter } : undefined}
        />
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
            setConfirmInput("");
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("wiki.confirm_delete_title")}</DialogTitle>
            <DialogDescription>
              {t("wiki.confirm_delete_message")}
            </DialogDescription>
          </DialogHeader>
          {pendingDelete && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("wiki.confirm_delete_input_hint").replace(
                  "{slug}",
                  pendingDelete.slug,
                )}
              </p>
              <Input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={pendingDelete.slug}
                disabled={deleting}
              />
              {deleteError && (
                <Alert variant="destructive">
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              {t("wiki.edit.cancel_button")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={
                deleting || !pendingDelete || confirmInput !== pendingDelete.slug
              }
            >
              {deleting ? "…" : t("wiki.delete_button")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
