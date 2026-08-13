"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  FileText,
  History,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import {
  deleteWiki,
  fetchAdminWikiList,
  fetchAdminWikiStats,
} from "@/lib/wiki/api";
import type {
  WikiAdminStats,
  WikiListItem,
  WikiListResponse,
} from "@/models/dtos/wiki.dto";
import { categoryLabelKey } from "@/lib/wiki/category-label";
import { getApiErrorMessage, type ApiError } from "@/lib/wiki/http";
import {
  ADMIN_WIKI_CATEGORIES,
  buildAdminWikiListHref,
  parseAdminWikiListQuery,
  type AdminWikiListStatus,
} from "@/components/wiki/admin-wiki-list-query";
import { WikiPagination } from "@/components/wiki/wiki-pagination";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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

const ADMIN_WIKI_PATH = "/dashboard/wiki";
const ADMIN_WIKI_PAGE_SIZE = 10;

export function AdminWikiListClient() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const { page, q, status, category } = parseAdminWikiListQuery(sp);

  const [data, setData] = useState<WikiListResponse | null>(null);
  const [stats, setStats] = useState<WikiAdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState(q);
  const [pendingDelete, setPendingDelete] = useState<WikiListItem | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminWikiList({
        page,
        limit: ADMIN_WIKI_PAGE_SIZE,
        q: q || undefined,
        status,
        category: category || undefined,
      });
      setData(result);
    } catch (e) {
      setError(getApiErrorMessage(e as ApiError, "Load failed"));
    } finally {
      setLoading(false);
    }
  }, [category, page, q, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    void fetchAdminWikiStats()
      .then(setStats)
      .catch((e: unknown) => {
        setError(getApiErrorMessage(e as ApiError, "Load failed"));
      });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchText(q);
  }, [q]);

  useEffect(() => {
    if (searchText.trim() === q) return;
    const timer = window.setTimeout(() => {
      router.replace(
        buildAdminWikiListHref(
          ADMIN_WIKI_PATH,
          { page, q, status, category },
          { q: searchText },
        ),
      );
    }, 350);
    return () => window.clearTimeout(timer);
  }, [category, page, q, router, searchText, status]);

  const handleStatus = (next: AdminWikiListStatus) => {
    router.push(
      buildAdminWikiListHref(
        ADMIN_WIKI_PATH,
        { page, q, status, category },
        { status: next },
      ),
    );
  };

  const handleCategory = (
    next: "" | (typeof ADMIN_WIKI_CATEGORIES)[number],
  ) => {
    router.push(
      buildAdminWikiListHref(
        ADMIN_WIKI_PATH,
        { page, q, status, category },
        { category: next },
      ),
    );
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
      if (data?.items.length === 1 && page > 1) {
        router.replace(
          buildAdminWikiListHref(
            ADMIN_WIKI_PATH,
            { page, q, status, category },
            { page: page - 1 },
          ),
        );
      } else {
        await load();
      }
      setPendingDelete(null);
      setConfirmInput("");
      setDeleteError(null);
    } catch (e) {
      setDeleteError(getApiErrorMessage(e as ApiError, "Delete failed"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
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

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats ? (
          <>
            <StatCard label={t("wiki.stats.total_pages")} value={stats.totalPages} />
            <StatCard label={t("wiki.stats.published")} value={stats.published} />
            <StatCard label={t("wiki.stats.drafts")} value={stats.drafts} />
            <StatCard label={t("wiki.stats.total_revisions")} value={stats.totalRevisions} />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t("wiki.admin_search_placeholder")}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Segmented status filter */}
        <div className="inline-flex rounded-md border bg-muted p-0.5">
          {(["all", "published", "draft"] as AdminWikiListStatus[]).map((mode) => {
            const label =
              mode === "all"
                ? t("wiki.filter_all")
                : mode === "published"
                  ? t("wiki.published_badge")
                  : t("wiki.draft_badge");
            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleStatus(mode)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-sm transition-colors",
                  status === mode
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Sort (cosmetic) */}
        <Select defaultValue="updated">
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">{t("wiki.sort_by_updated")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["", ...ADMIN_WIKI_CATEGORIES] as const).map((cat) => {
          const selected = category === cat;
          const label =
            cat === "" ? t("wiki.filter_all") : t(categoryLabelKey(cat));
          return (
            <button
              key={cat || "all"}
              type="button"
              onClick={() => handleCategory(cat)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("wiki.col_title")}</TableHead>
              <TableHead>{t("wiki.col_category")}</TableHead>
              <TableHead>{t("wiki.col_revisions")}</TableHead>
              <TableHead>{t("wiki.col_status")}</TableHead>
              <TableHead className="w-[80px] text-right">{t("wiki.col_actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`s-${i}`}>
                  <TableCell><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-3 w-1/3" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))}
            {!loading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
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
                const catLabel = item.metadataJson?.category
                  ? t(categoryLabelKey(item.metadataJson.category))
                  : "—";
                return (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[300px]">
                      <div className="font-medium truncate break-words break-all" title={title}>{title}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate break-words break-all" title={`/${item.slug}`}>
                        /{item.slug}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {catLabel}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        {item.revisionCount ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.isPublished ? (
                        <Badge>{t("wiki.published_badge")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("wiki.draft_badge")}</Badge>
                      )}
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
                                locale === "vi" ? (item.slugVi || item.slug) : (item.slug || item.slugVi),
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
                              href={`/dashboard/wiki/${item.id}/history`}
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
          basePath={ADMIN_WIKI_PATH}
          extraParams={{
            q,
            status: status === "all" ? "" : status,
            category,
          }}
        />
      )}

      {/* Delete confirmation dialog */}
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
