"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { toast } from "react-toastify";
import { useI18n } from "@/lib/i18/i18n-context";
import { fetchAdminWikiList, fetchAdminWikiStats, deleteWiki } from "@/lib/wiki/api";
import type { WikiListResponse, WikiListItem, WikiAdminStats } from "@/models/dtos/wiki.dto";
import type { WikiCategory } from "@/models/dtos/wiki-metadata.dto";
import { categoryLabelKey } from "@/lib/wiki/category-label";
import { getApiErrorMessage, type ApiError } from "@/lib/wiki/http";
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

type FilterMode = "all" | "published" | "draft";
type SortOption =
  | "updated_desc"
  | "updated_asc"
  | "title_asc"
  | "title_desc";

export function AdminWikiListClient() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const filter: FilterMode = (sp.get("filter") as FilterMode) ?? "all";

  const [data, setData] = useState<WikiListResponse | null>(null);
  const [stats, setStats] = useState<WikiAdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"All" | WikiCategory>("All");
  const [sortBy, setSortBy] = useState<SortOption>("updated_desc");
  const [pendingDelete, setPendingDelete] = useState<WikiListItem | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, statsResult] = await Promise.all([
        fetchAdminWikiList({ page, limit: 50 }),
        fetchAdminWikiStats(),
      ]);
      setData(result);
      setStats(statsResult);
    } catch (e) {
      setError(getApiErrorMessage(e as ApiError, "Load failed"));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const handleFilter = (next: FilterMode) => {
    const params = new URLSearchParams();
    if (next !== "all") params.set("filter", next);
    router.push(`/dashboard/wiki${params.toString() ? "?" + params : ""}`);
  };

  const categories = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const cats: WikiCategory[] = [];
    for (const item of data.items) {
      const cat = item.metadataJson?.category;
      if (cat && !seen.has(cat)) {
        seen.add(cat);
        cats.push(cat);
      }
    }
    return cats;
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    let items = data.items;

    if (filter === "published") items = items.filter((i) => i.isPublished);
    if (filter === "draft") items = items.filter((i) => !i.isPublished);

    if (categoryFilter !== "All") {
      items = items.filter((i) => i.metadataJson?.category === categoryFilter);
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.titleVi.toLowerCase().includes(q) ||
          i.slug.toLowerCase().includes(q),
      );
    }

    const sorted = [...items].sort((a, b) => {
      if (sortBy === "updated_desc") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === "updated_asc") {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      if (sortBy === "title_asc") {
        const titleA = locale === "vi" ? (a.titleVi || a.title) : (a.title || a.titleVi);
        const titleB = locale === "vi" ? (b.titleVi || b.title) : (b.title || b.titleVi);
        return titleA.localeCompare(titleB, locale);
      }
      if (sortBy === "title_desc") {
        const titleA = locale === "vi" ? (a.titleVi || a.title) : (a.title || a.titleVi);
        const titleB = locale === "vi" ? (b.titleVi || b.title) : (b.title || b.titleVi);
        return titleB.localeCompare(titleA, locale);
      }
      return 0;
    });

    return sorted;
  }, [data, filter, categoryFilter, searchText, sortBy, locale]);

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
      toast.success(t("wiki.delete_success"));
    } catch (e) {
      const msg = getApiErrorMessage(e as ApiError, t("wiki.delete_failed"));
      setDeleteError(msg);
      toast.error(msg);
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
          {(["all", "published", "draft"] as FilterMode[]).map((mode) => {
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
                onClick={() => handleFilter(mode)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-sm transition-colors",
                  filter === mode
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <Select
          value={sortBy}
          onValueChange={(val) => setSortBy(val as SortOption)}
        >
          <SelectTrigger className="w-[190px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated_desc">
              {t("wiki.sort_recently_updated")}
            </SelectItem>
            <SelectItem value="updated_asc">
              {t("wiki.sort_oldest_updated")}
            </SelectItem>
            <SelectItem value="title_asc">
              {t("wiki.sort_title_asc")}
            </SelectItem>
            <SelectItem value="title_desc">
              {t("wiki.sort_title_desc")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {(["All" as const, ...categories]).map((cat) => {
            const selected = categoryFilter === cat;
            const label = cat === "All" ? t("wiki.filter_all") : t(categoryLabelKey(cat));
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
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
      )}

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
            {!loading && filteredItems.length === 0 && (
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
              filteredItems.map((item) => {
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
          basePath="/dashboard/wiki"
          extraParams={filter !== "all" ? { filter } : undefined}
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
