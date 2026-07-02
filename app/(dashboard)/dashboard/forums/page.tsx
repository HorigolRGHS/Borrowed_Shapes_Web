"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile } from "@/lib/api/api-client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Search, Star, Eye, MessageSquare, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const BADGE_BASE_CLASS = "rounded-[12px] uppercase tracking-[0.18em] text-[11px] font-semibold";
const ITEMS_PER_PAGE = 10;

const TYPE_BADGE_STYLES: Record<string, string> = {
  GENERAL: `${BADGE_BASE_CLASS} border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-300`,
  BUG_REPORT: `${BADGE_BASE_CLASS} border-red-300 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-300`,
  GUIDE: `${BADGE_BASE_CLASS} border-green-300 dark:border-green-800/50 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-300`,
  SUGGESTION: `${BADGE_BASE_CLASS} border-purple-300 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-300`,
  FAN_ART: `${BADGE_BASE_CLASS} border-pink-300 dark:border-pink-800/50 bg-pink-50 dark:bg-pink-950/20 text-pink-600 dark:text-pink-300`,
  LOOKING_FOR_PARTY: `${BADGE_BASE_CLASS} border-blue-300 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-300`,
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  OPEN: `${BADGE_BASE_CLASS} border-emerald-300 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-300`,
  CLOSED: `${BADGE_BASE_CLASS} border-red-300 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-300`,
  ARCHIVED: `${BADGE_BASE_CLASS} border-slate-300 dark:border-slate-800/50 bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400`,
};

interface Thread {
  id: string;
  title: string;
  slug: string;
  score: number;
  viewCount: number;
  commentCount: number;
  isPinned: boolean;
  postType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; displayName: string; imgUrl: string | null } | null;
  category: { id: string; name: string; slug: string } | null;
}

interface Category {
  id: string;
  name: string;
  name_vi?: string;
  slug: string;
}

export default function DashboardForumsPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [postTypeFilter, setPostTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt" | "score">("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const profile = getUserProfile();
    if (!profile || profile.role !== "ADMIN") {
      router.push("/");
    } else {
      setUser(profile);
      fetchCategories();
    }
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchThreads();
    }
  }, [user, categoryFilter, postTypeFilter, statusFilter, currentPage, sortBy, order]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get("/api/category");
      if (response.data?.success) {
        setCategories(response.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchThreads = async (overrides?: {
    q?: string;
    categoryId?: string;
    postType?: string;
    status?: string;
    page?: number;
    sortBy?: "createdAt" | "updatedAt" | "score";
    order?: "asc" | "desc";
  }) => {
    try {
      const qVal = overrides && "q" in overrides ? overrides.q : searchQuery;
      const catVal = overrides && "categoryId" in overrides ? overrides.categoryId : categoryFilter;
      const typeVal = overrides && "postType" in overrides ? overrides.postType : postTypeFilter;
      const statusVal = overrides && "status" in overrides ? overrides.status : statusFilter;
      const pageVal = overrides && "page" in overrides ? overrides.page : currentPage;
      const sortByVal = overrides && "sortBy" in overrides ? overrides.sortBy : sortBy;
      const orderVal = overrides && "order" in overrides ? overrides.order : order;

      const params: any = {
        page: pageVal,
        limit: ITEMS_PER_PAGE,
        sortBy: sortByVal,
        order: orderVal,
      };

      if (qVal && qVal.trim()) params.q = qVal.trim();
      if (catVal !== "all") params.categoryId = catVal;
      if (typeVal !== "all") params.postType = typeVal;
      if (statusVal !== "all") params.status = statusVal;

      const response = await axios.get("/api/forums", { params });
      if (response.data?.success) {
        const payload = response.data.data;
        setThreads(payload.items || []);
        setTotalPages(payload.meta?.pages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setCurrentPage(1);
      fetchThreads();
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setPostTypeFilter("all");
    setStatusFilter("all");
    setSortBy("createdAt");
    setOrder("desc");
    setCurrentPage(1);
    fetchThreads({
      q: "",
      categoryId: "all",
      postType: "all",
      status: "all",
      page: 1,
      sortBy: "createdAt",
      order: "desc",
    });
  };

  const renderPaginationItems = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis-start");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (i > 1 && i < totalPages) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("ellipsis-end");
      pages.push(totalPages);
    }

    return pages.map((page, idx) => {
      if (typeof page === "string") {
        return (
          <PaginationItem key={`ellipsis-${idx}`}>
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      return (
        <PaginationItem key={page}>
          <PaginationLink
            href="#"
            isActive={currentPage === page}
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage(page);
            }}
          >
            {page}
          </PaginationLink>
        </PaginationItem>
      );
    });
  };

  if (!user) return null;

  return (
    <div className="w-full text-foreground flex flex-col">
      <main className="flex-1 px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6 max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight">
              {t("forums.dashboard.title") || "Forum Thread Management"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {t("forums.dashboard.subtitle") || "View, pin, edit, and delete forum threads"}
            </p>
            <div className="mt-2 h-0.5 w-12 rounded-[12px] bg-amber-500" />
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col gap-4 bg-card p-4 border border-border rounded-2xl">
            <div className="relative w-full">
              <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-muted-foreground">
                <Search className="h-4 w-4" />
              </span>
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                placeholder={t("forums.dashboard.search_placeholder") || "Search by title, author, or keyword..."}
                className="pl-10 bg-background border-border text-foreground placeholder-muted-foreground"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Sort Filter */}
              <Select
                value={`${sortBy}-${order}`}
                onValueChange={(val) => {
                  const [newSortBy, newOrder] = val.split("-");
                  setSortBy(newSortBy as any);
                  setOrder(newOrder as any);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[180px] bg-background border-border text-foreground">
                  <SelectValue placeholder={t("forums.filter.sort") || "Sort By"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-desc">{t("forums.dashboard.sort_newest") || "Newest"}</SelectItem>
                  <SelectItem value="createdAt-asc">{t("forums.dashboard.sort_oldest") || "Oldest"}</SelectItem>
                  <SelectItem value="updatedAt-desc">{t("forums.dashboard.sort_recently_updated") || "Recently Updated"}</SelectItem>
                  <SelectItem value="score-desc">{t("forums.dashboard.sort_highest_score") || "Highest Score"}</SelectItem>
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="w-[160px] bg-background border-border text-foreground">
                  <SelectValue placeholder={t("forums.dashboard.filter_all_categories") || "All Categories"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("forums.dashboard.filter_all_categories") || "All Categories"}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {locale === "vi" && cat.name_vi ? cat.name_vi : cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Post Type Filter */}
              <Select value={postTypeFilter} onValueChange={(val) => { setPostTypeFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="w-[160px] bg-background border-border text-foreground">
                  <SelectValue placeholder={t("forums.dashboard.filter_all_types") || "All Types"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("forums.dashboard.filter_all_types") || "All Types"}</SelectItem>
                  <SelectItem value="GENERAL">{t("forums.post_type.general") || "General"}</SelectItem>
                  <SelectItem value="BUG_REPORT">{t("forums.post_type.bug_report") || "Bug Report"}</SelectItem>
                  <SelectItem value="GUIDE">{t("forums.post_type.guide") || "Guide"}</SelectItem>
                  <SelectItem value="SUGGESTION">{t("forums.post_type.suggestion") || "Suggestion"}</SelectItem>
                  <SelectItem value="FAN_ART">{t("forums.post_type.fan_art") || "Fan Art"}</SelectItem>
                  <SelectItem value="LOOKING_FOR_PARTY">{t("forums.post_type.looking_for_party") || "Looking For Party"}</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="w-[160px] bg-background border-border text-foreground">
                  <SelectValue placeholder={t("forums.dashboard.filter_all_status") || "All Status"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("forums.dashboard.filter_all_status") || "All Status"}</SelectItem>
                  <SelectItem value="OPEN">OPEN</SelectItem>
                  <SelectItem value="CLOSED">CLOSED</SelectItem>
                  <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={clearFilters}
                variant="outline"
                className="border-border hover:bg-muted text-muted-foreground font-bold transition-all text-xs"
              >
                {t("forums.dashboard.clear_filters") || "CLEAR"}
              </Button>
            </div>
          </div>
        </div>

        {/* List Data Table */}
        <>
          <div className="rounded-[12px] border border-border bg-card overflow-hidden shadow-xl">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-muted/20">
                  <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                    {t("forums.dashboard.col_title") || "Thread Title"}
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                    {t("forums.dashboard.col_category_author") || "Category & Author"}
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                    {t("forums.dashboard.col_post_type") || "Post Type"}
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold text-center">
                    {t("forums.dashboard.col_status") || "Status"}
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold text-center">
                    {t("forums.dashboard.col_stats") || "Stats"}
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                    {t("forums.dashboard.col_created_date") || "Created Date"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {threads.length > 0 ? (
                  threads.map((thread) => (
                    <TableRow
                      key={thread.id}
                      onClick={() => router.push(`/dashboard/forums/${thread.id}`)}
                      className="border-border hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      {/* Thread Title */}
                      <TableCell className="max-w-[300px]">
                        <div className="flex items-start gap-2">
                          {thread.isPinned && (
                            <Star className="h-4 w-4 fill-amber-500 text-amber-500 shrink-0 mt-0.5" />
                          )}
                          <span className="font-semibold text-foreground truncate hover:text-amber-500 transition-colors">
                            {thread.title}
                          </span>
                        </div>
                      </TableCell>

                      {/* Category & Author */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-foreground/90 text-xs font-semibold">
                            {thread.author?.displayName || t("forums.unknown_author") || "Unknown"}
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            {thread.category ? (locale === "vi" && (thread.category as any).name_vi ? (thread.category as any).name_vi : thread.category.name) : "N/A"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Post Type */}
                      <TableCell>
                        <Badge variant="outline" className={TYPE_BADGE_STYLES[thread.postType] || BADGE_BASE_CLASS}>
                          {t(`forums.post_type.${thread.postType.toLowerCase()}`) || thread.postType}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        <Badge variant="outline" className={STATUS_BADGE_STYLES[thread.status] || BADGE_BASE_CLASS}>
                          {thread.status}
                        </Badge>
                      </TableCell>

                      {/* Stats */}
                      <TableCell>
                        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1" title="Views">
                            <Eye className="h-3.5 w-3.5" />
                            {thread.viewCount >= 1000 ? `${(thread.viewCount / 1000).toFixed(1)}k` : thread.viewCount}
                          </span>
                          <span className="flex items-center gap-1" title="Comments">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {thread.commentCount ?? 0}
                          </span>
                        </div>
                      </TableCell>

                      {/* Created Date */}
                      <TableCell className="text-muted-foreground text-xs font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground/75" />
                          {new Date(thread.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                      {t("forums.dashboard.no_threads_found") || "No forum threads match your filters."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {threads.length > 0 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    className={currentPage <= 1 ? "pointer-events-none opacity-40 text-muted-foreground" : "text-muted-foreground hover:bg-muted"}
                  />
                </PaginationItem>
                {renderPaginationItems()}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                    }}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-40 text-muted-foreground" : "text-muted-foreground hover:bg-muted"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      </main>
    </div>
  );
}
