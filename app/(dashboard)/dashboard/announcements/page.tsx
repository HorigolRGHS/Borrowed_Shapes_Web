"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile } from "@/lib/api/api-client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { Plus, Search, Pencil, Trash2, AlertTriangle, ChevronDown, Eye } from "lucide-react";
import { AnnouncementContentEditor } from '@/components/announcements/announcement-content-editor';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BADGE_BASE_CLASS = "rounded-[12px] uppercase tracking-[0.18em] text-[11px]";
const ITEMS_PER_PAGE = 10;

const TYPE_BADGE_STYLES: Record<string, string> = {
  NEWS: `${BADGE_BASE_CLASS} w-32 justify-center border-emerald-500/70 bg-emerald-500/10 text-emerald-300`,
  PATCH_NOTE: `${BADGE_BASE_CLASS} w-32 justify-center border-purple-500/70 bg-purple-500/10 text-purple-300`,
  UPDATE: `${BADGE_BASE_CLASS} w-32 justify-center border-sky-500/70 bg-sky-500/10 text-sky-300`,
  EVENT: `${BADGE_BASE_CLASS} w-32 justify-center border-rose-500/70 bg-rose-500/10 text-rose-300`,
  MAINTENANCE: `${BADGE_BASE_CLASS} w-32 justify-center border-amber-500/70 bg-amber-500/10 text-amber-300`,
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  Published: `${BADGE_BASE_CLASS} w-24 justify-center border-emerald-500/70 bg-emerald-500/10 text-emerald-300`,
  Scheduled: `${BADGE_BASE_CLASS} w-24 justify-center border-yellow-500/70 bg-yellow-500/10 text-yellow-300`,
};

interface Announcement {
  id: string;
  slug: string;
  slugVi: string;
  title: string;
  titleVi: string;
  summary?: string;
  summaryVi?: string;
  content: string;
  contentVi: string;
  type: string;
  isPinned: boolean;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; displayName: string } | null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function getStatus(a: Announcement): "Published" | "Scheduled" {
  if (a.publishedAt && new Date(a.publishedAt) > new Date()) {
    return "Scheduled";
  }

  return "Published";
}

export default function AnnouncementsPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  // const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pinnedFilter, setPinnedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteAnnouncement, setDeleteAnnouncement] = useState<Announcement | null>(null);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);
  const [fetchingDetailId, setFetchingDetailId] = useState<string | null>(null);
  const isClosingRef = useRef(false);

  const [formData, setFormData] = useState({
    title: "",
    titleVi: "",
    slug: "",
    slugVi: "",
    summary: "",
    summaryVi: "",
    content: "",
    contentVi: "",
    type: "NEWS",
    isPinned: false,
    isPublished: true,
    publishedAt: "",
  });
  const [autoSlug, setAutoSlug] = useState(true);
  const [autoSlugVi, setAutoSlugVi] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formTouched, setFormTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case "title":
        if (!value.trim()) return t("announcements.validation.title_required");
        if (value.length > 300) return t("announcements.validation.title_max");
        return "";
      case "titleVi":
        if (!value.trim()) return t("announcements.validation.title_vi_required");
        if (value.length > 300) return t("announcements.validation.title_vi_max");
        return "";
      case "slug":
        if (!value.trim()) return t("announcements.validation.slug_required");
        if (!/^[a-z0-9-]+$/.test(value)) return t("announcements.validation.slug_invalid");
        if (value.length > 200) return t("announcements.validation.slug_max");
        return "";
      case "slugVi":
        if (!value.trim()) return t("announcements.validation.slug_vi_required");
        if (!/^[a-z0-9-]+$/.test(value)) return t("announcements.validation.slug_vi_invalid");
        if (value.length > 200) return t("announcements.validation.slug_vi_max");
        return "";
      case "content":
        if (!value.trim()) return t("announcements.validation.content_required");
        return "";
      case "contentVi":
        if (!value.trim()) return t("announcements.validation.content_vi_required");
        return "";
      case "summary": {
        const plain = value.replace(/<[^>]*>/g, "");
        if (plain.length > 500) return t("announcements.validation.summary_max");
        return "";
      }
      case "summaryVi": {
        const plain = value.replace(/<[^>]*>/g, "");
        if (plain.length > 500) return t("announcements.validation.summary_vi_max");
        return "";
      }
      default:
        return "";
    }
  };

  const validateAllFields = (): boolean => {
    const errors: Record<string, string> = {};
    const touched: Record<string, boolean> = {};
    const fields = ["title", "titleVi", "slug", "slugVi", "content", "contentVi", "summary", "summaryVi"];
    for (const field of fields) {
      touched[field] = true;
      const error = validateField(field, (formData as any)[field]);
      if (error) errors[field] = error;
    }
    setFormErrors(errors);
    setFormTouched(touched);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (field: string, value: string) => {
    const next = { ...formData, [field]: value };

    // Auto-generate slug from title
    if (field === "title" && autoSlug) {
      next.slug = slugify(value);
    }
    if (field === "titleVi" && autoSlugVi) {
      next.slugVi = slugify(value);
    }

    setFormData(next);
    if (formTouched[field]) {
      const error = validateField(field, value);
      setFormErrors((prev) => {
        const copy = { ...prev };
        if (error) copy[field] = error;
        else delete copy[field];
        return copy;
      });
    }
  };

  const handleFieldBlur = (field: string) => {
    if (isClosingRef.current) return;
    setFormTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, (formData as any)[field]);
    setFormErrors((prev) => {
      const copy = { ...prev };
      if (error) copy[field] = error;
      else delete copy[field];
      return copy;
    });
  };

  useEffect(() => {
    const profile = getUserProfile();
    if (!profile || profile.role !== "ADMIN") {
      router.push("/");
    } else {
      setUser(profile);
      fetchAnnouncements();
    }
  }, [router, typeFilter, sortBy, currentPage]);

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get("/api/announcements/admin", {
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          type: typeFilter === "all" ? undefined : typeFilter,
          // q: searchQuery || undefined,
          sortBy: sortBy,
          order: "desc",
        },
      });

      if (response.data?.success) {
        const payload = response.data.data;
        setAnnouncements(payload.items || []);
        setTotalPages(payload.totalPages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncementDetail = async (id: string): Promise<Announcement | null> => {
    setFetchingDetailId(id);
    try {
      const response = await axios.get(`/api/announcements/admin/${id}`);
      if (response.data?.success) {
        return response.data.data;
      }
    } catch (error: any) {
      console.error("Failed to fetch announcement detail:", error);
      const message = error.response?.data?.message || "Failed to fetch details";
      toast.error(t(message) || message);
    } finally {
      setFetchingDetailId(null);
    }
    return null;
  };

  // const handleSearch = () => {
  //   if (currentPage !== 1) {
  //     setCurrentPage(1);
  //   } else {
  //     fetchAnnouncements();
  //   }
  // };

  const handleCreate = async () => {
    if (!validateAllFields()) return;
    try {
      const payload = buildPayload();
      const response = await axios.post("/api/announcements/create", payload);
      if (response.data?.success) {
        toast.success(t("announcements.create_success"));
      } else {
        const message = response.data?.message || t("announcements.create_failed");
        toast.error(t(message) || message);
        return;
      }
      setShowCreateModal(false);
      resetForm();
      fetchAnnouncements();
    } catch (error: any) {
      console.error("Failed to create announcement:", error);
      const message = error.response?.data?.message || t("announcements.create_failed");
      toast.error(t(message) || message);
    }
  };

  const handleEdit = async () => {
    if (!editingAnnouncement) return;
    if (!validateAllFields()) return;
    try {
      const payload = buildPayload();
      const response = await axios.put(
        `/api/announcements/update/${editingAnnouncement.id}`,
        payload
      );
      if (response.data?.success) {
        toast.success(t("announcements.update_success"));
      } else {
        const message = response.data?.message || t("announcements.update_failed");
        toast.error(t(message) || message);
        return;
      }
      setEditingAnnouncement(null);
      setShowCreateModal(false);
      resetForm();
      fetchAnnouncements();
    } catch (error: any) {
      console.error("Failed to update announcement:", error);
      const message = error.response?.data?.message || t("announcements.update_failed");
      toast.error(t(message) || message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await axios.delete(`/api/announcements/delete/${id}`);
      if (response.data?.success) {
        toast.success(t("announcements.delete_success"));
      } else {
        const message = response.data?.message || t("announcements.delete_failed");
        toast.error(t(message) || message);
        return;
      }
      fetchAnnouncements();
      setDeleteAnnouncement(null);
    } catch (error: any) {
      console.error("Failed to delete announcement:", error);
      const message = error.response?.data?.message || t("announcements.delete_failed");
      toast.error(t(message) || message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      titleVi: "",
      slug: "",
      slugVi: "",
      summary: "",
      summaryVi: "",
      content: "",
      contentVi: "",
      type: "NEWS",
      isPinned: false,
      isPublished: true,
      publishedAt: "",
    });
    setAutoSlug(true);
    setAutoSlugVi(true);
    setFormErrors({});
    setFormTouched({});
  };

  const buildPayload = () => {
    if (formData.isPublished) {
      return {
        title: formData.title,
        titleVi: formData.titleVi,
        slug: formData.slug,
        slugVi: formData.slugVi,
        summary: formData.summary || undefined,
        summaryVi: formData.summaryVi || undefined,
        content: formData.content,
        contentVi: formData.contentVi,
        type: formData.type,
        isPinned: formData.isPinned,
        isPublished: true,
        publishedAt: new Date().toISOString(),
      };
    }

    const scheduledDate = formData.publishedAt ? new Date(formData.publishedAt) : null;
    return {
      title: formData.title,
      titleVi: formData.titleVi,
      slug: formData.slug,
      slugVi: formData.slugVi,
      summary: formData.summary || undefined,
      summaryVi: formData.summaryVi || undefined,
      content: formData.content,
      contentVi: formData.contentVi,
      type: formData.type,
      isPinned: formData.isPinned,
      isPublished: true,
      publishedAt: scheduledDate ? scheduledDate.toISOString() : new Date().toISOString(),
    };
  };

  const openEditModal = (a: Announcement) => {
    setEditingAnnouncement(a);
    setAutoSlug(true);
    setAutoSlugVi(true);

    const isScheduled = a.publishedAt && new Date(a.publishedAt) > new Date();
    setFormData({
      title: a.title,
      titleVi: a.titleVi,
      slug: a.slug || slugify(a.title),
      slugVi: a.slugVi || slugify(a.titleVi),
      summary: a.summary || "",
      summaryVi: a.summaryVi || "",
      content: a.content,
      contentVi: a.contentVi,
      type: a.type,
      isPinned: a.isPinned,
      isPublished: !isScheduled,
      publishedAt: a.publishedAt ? formatDateTimeLocal(a.publishedAt) : "",
    });
  };

  const formatDateTimeLocal = (value?: string) => {
    if (!value) return "";
    try {
      const date = new Date(value);
      const offset = date.getTimezoneOffset();
      const localDate = new Date(date.getTime() - offset * 60000);
      return localDate.toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  // Client-side filtering for status and pinned (backend doesn't support these filters)
  const filteredAnnouncements = announcements.filter((a) => {
    if (statusFilter !== "all") {
      const status = getStatus(a);
      if (statusFilter === "scheduled" && status !== "Scheduled") return false;
      if (statusFilter === "published" && status !== "Published") return false;
    }
    if (pinnedFilter !== "all") {
      if (pinnedFilter === "pinned" && !a.isPinned) return false;
      if (pinnedFilter === "not_pinned" && a.isPinned) return false;
    }
    return true;
  });

  useEffect(() => {
    if (currentPage > 1 && filteredAnnouncements.length === 0) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [announcements, currentPage, totalPages, filteredAnnouncements.length]);

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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("announcements.management_title")}</h1>
          <p className="text-muted-foreground mt-2">{t("announcements.management_subtitle")}</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingAnnouncement(null);
            setShowCreateModal(true);
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white self-start md:self-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("announcements.create_announcement")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setCurrentPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("announcements.filter_all_types")}</SelectItem>
                <SelectItem value="NEWS">{t("announcements.filter_type_news")}</SelectItem>
                <SelectItem value="PATCH_NOTE">{t("announcements.filter_type_patch_note")}</SelectItem>
                <SelectItem value="UPDATE">{t("announcements.filter_type_update")}</SelectItem>
                <SelectItem value="EVENT">{t("announcements.filter_type_event")}</SelectItem>
                <SelectItem value="MAINTENANCE">{t("announcements.filter_type_maintenance")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("announcements.filter_all_status")}</SelectItem>
                <SelectItem value="scheduled">{t("announcements.filter_status_scheduled")}</SelectItem>
                <SelectItem value="published">{t("announcements.filter_status_published")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={pinnedFilter} onValueChange={(val) => { setPinnedFilter(val); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("announcements.filter_all_pinned")}</SelectItem>
                <SelectItem value="pinned">{t("announcements.filter_pinned")}</SelectItem>
                <SelectItem value="not_pinned">{t("announcements.filter_not_pinned")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(val) => { setSortBy(val); setCurrentPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="publishedAt">{t("announcements.sort_by_published")}</SelectItem>
                <SelectItem value="updatedAt">{t("announcements.sort_by_updated")}</SelectItem>
                <SelectItem value="createdAt">{t("announcements.sort_by_created")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="rounded-[12px] border border-border bg-card p-12 text-center text-muted-foreground">{t("announcements.loading")}</div>
          ) : (
            <>
              {/* Table */}
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{t("announcements.col_title")}</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{t("announcements.col_type")}</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{t("announcements.col_status")}</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium text-center">{t("announcements.col_pinned")}</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{t("announcements.col_published_at")}</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium text-center">{t("announcements.col_actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnnouncements.length > 0 ? (
                      filteredAnnouncements.map((a) => {
                        const status = getStatus(a);
                        return (
                          <TableRow key={a.id} className="border-border hover:bg-muted/50">
                            {/* Title + Author */}
                            <TableCell>
                              <div className="flex flex-col">
                                <span 
                                  className="font-medium text-foreground truncate max-w-[280px] block"
                                  title={locale === "vi" ? a.titleVi : a.title}
                                >
                                  {locale === "vi" ? a.titleVi : a.title}
                                </span>
                                <span 
                                  className="text-xs text-muted-foreground truncate max-w-[280px] block"
                                  title={`${t("announcements.by_author")} ${a.author?.displayName || "Unknown"}`}
                                >
                                  {t("announcements.by_author")} {a.author?.displayName || "Unknown"}
                                </span>
                              </div>
                            </TableCell>
                            {/* Type */}
                            <TableCell>
                              <Badge variant="outline" className={TYPE_BADGE_STYLES[a.type] || BADGE_BASE_CLASS}>
                                {a.type}
                              </Badge>
                            </TableCell>
                            {/* Status */}
                            <TableCell>
                              <Badge variant="outline" className={STATUS_BADGE_STYLES[status] || BADGE_BASE_CLASS}>
                                {t(`announcements.status_${status.toLowerCase()}`)}
                              </Badge>
                            </TableCell>
                            {/* Pinned */}
                            <TableCell className="text-center">
                              {a.isPinned ? (
                                <Badge variant="outline" className={`${BADGE_BASE_CLASS} border-yellow-500/70 bg-yellow-500/10 text-yellow-300`}>
                                  {t("announcements.pinned_yes")}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">{t("announcements.pinned_no")}</span>
                              )}
                            </TableCell>
                            {/* Published At */}
                            <TableCell className="text-muted-foreground">
                              {a.publishedAt
                                ? new Date(a.publishedAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                                : "—"}
                            </TableCell>
                            {/* Actions */}
                            <TableCell className="text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      const detail = await fetchAnnouncementDetail(a.id);
                                      if (detail) {
                                        setViewingAnnouncement(detail);
                                      }
                                    }}
                                    disabled={fetchingDetailId !== null}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    {t("announcements.action_view")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      const detail = await fetchAnnouncementDetail(a.id);
                                      if (detail) {
                                        openEditModal(detail);
                                      }
                                    }}
                                    disabled={fetchingDetailId !== null}
                                    className="cursor-pointer"
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    {t("announcements.action_edit")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeleteAnnouncement(a)}
                                    disabled={fetchingDetailId !== null}
                                    className="cursor-pointer text-rose-400 focus:text-rose-400"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t("announcements.action_delete")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          {t("announcements.no_announcements")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {announcements.length > 0 && (
                <Pagination className="mt-8">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                        className={currentPage <= 1 ? "pointer-events-none opacity-40" : ""}
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
                        className={currentPage >= totalPages ? "pointer-events-none opacity-40" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog
        open={showCreateModal || editingAnnouncement !== null}
        onOpenChange={(open) => {
          if (!open) {
            isClosingRef.current = true;
            setShowCreateModal(false);
            setEditingAnnouncement(null);
            resetForm();
            setTimeout(() => { isClosingRef.current = false; }, 0);
          }
        }}
      >
        <DialogContent className="max-w-3xl h-[90vh] max-h-[95vh] overflow-y-auto custom-scroll">
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-lg bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? t("announcements.edit_announcement") : t("announcements.create_announcement")}
            </DialogTitle>
            <DialogDescription>
              {t("announcements.create_edit_subtitle")}
            </DialogDescription>
          </DialogHeader>
          <form
            key={editingAnnouncement ? `edit-${editingAnnouncement.id}` : `create-${showCreateModal}`}
            onSubmit={(e) => {
              e.preventDefault();
              editingAnnouncement ? handleEdit() : handleCreate();
            }}
            className="space-y-5"
          >
            {/* Title EN + Title VI */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-muted-foreground">{t("announcements.form_title_en")}</Label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  onBlur={() => handleFieldBlur("title")}
                  className={formTouched.title && formErrors.title ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                />
                {formTouched.title && formErrors.title && (
                  <p className="mt-1.5 text-xs text-rose-400">{formErrors.title}</p>
                )}
              </div>
              <div>
                <Label className="mb-2 block text-muted-foreground">{t("announcements.form_title_vi")}</Label>
                <Input
                  type="text"
                  value={formData.titleVi}
                  onChange={(e) => handleFieldChange("titleVi", e.target.value)}
                  onBlur={() => handleFieldBlur("titleVi")}
                  className={formTouched.titleVi && formErrors.titleVi ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                />
                {formTouched.titleVi && formErrors.titleVi && (
                  <p className="mt-1.5 text-xs text-rose-400">{formErrors.titleVi}</p>
                )}
              </div>
            </div>

            {/* Slug EN + Slug VI */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-muted-foreground">{t("announcements.form_slug_en")}</Label>
                <Input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    handleFieldChange("slug", e.target.value);
                  }}
                  onBlur={() => handleFieldBlur("slug")}
                  className={formTouched.slug && formErrors.slug ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                />
                {formTouched.slug && formErrors.slug && (
                  <p className="mt-1.5 text-xs text-rose-400">{formErrors.slug}</p>
                )}
              </div>
              <div>
                <Label className="mb-2 block text-muted-foreground">{t("announcements.form_slug_vi")}</Label>
                <Input
                  type="text"
                  value={formData.slugVi}
                  onChange={(e) => {
                    setAutoSlugVi(false);
                    handleFieldChange("slugVi", e.target.value);
                  }}
                  onBlur={() => handleFieldBlur("slugVi")}
                  className={formTouched.slugVi && formErrors.slugVi ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                />
                {formTouched.slugVi && formErrors.slugVi && (
                  <p className="mt-1.5 text-xs text-rose-400">{formErrors.slugVi}</p>
                )}
              </div>
            </div>

            {/* Summary EN + Summary VI */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-muted-foreground">{t("announcements.form_summary_en")}</Label>
                <Input
                  type="text"
                  value={formData.summary}
                  onChange={(e) => handleFieldChange("summary", e.target.value)}
                  onBlur={() => handleFieldBlur("summary")}
                  className={formTouched.summary && formErrors.summary ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                />
                {formTouched.summary && formErrors.summary && (
                  <p className="mt-1.5 text-xs text-rose-400">{formErrors.summary}</p>
                )}
              </div>
              <div>
                <Label className="mb-2 block text-muted-foreground">{t("announcements.form_summary_vi")}</Label>
                <Input
                  type="text"
                  value={formData.summaryVi}
                  onChange={(e) => handleFieldChange("summaryVi", e.target.value)}
                  onBlur={() => handleFieldBlur("summaryVi")}
                  className={formTouched.summaryVi && formErrors.summaryVi ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                />
                {formTouched.summaryVi && formErrors.summaryVi && (
                  <p className="mt-1.5 text-xs text-rose-400">{formErrors.summaryVi}</p>
                )}
              </div>
            </div>

            {/* Content EN */}
            <div>
              <Label className="mb-2 block text-muted-foreground">{t("announcements.form_content_en")}</Label>
              <AnnouncementContentEditor
                data={formData.content}
                onChange={(html) => handleFieldChange("content", html)}
                onBlur={() => handleFieldBlur("content")}
              />
              {formTouched.content && formErrors.content && (
                <p className="mt-1.5 text-xs text-rose-400">{formErrors.content}</p>
              )}
            </div>

            {/* Content VI */}
            <div>
              <Label className="mb-2 block text-muted-foreground">{t("announcements.form_content_vi")}</Label>
              <AnnouncementContentEditor
                data={formData.contentVi}
                onChange={(html) => handleFieldChange("contentVi", html)}
                onBlur={() => handleFieldBlur("contentVi")}
              />
              {formTouched.contentVi && formErrors.contentVi && (
                <p className="mt-1.5 text-xs text-rose-400">{formErrors.contentVi}</p>
              )}
            </div>

            {/* Type + Pinned + Publish Now */}
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <Label className="mb-2 block text-muted-foreground">{t("announcements.form_type")}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEWS">{t("announcements.filter_type_news")}</SelectItem>
                    <SelectItem value="PATCH_NOTE">{t("announcements.filter_type_patch_note")}</SelectItem>
                    <SelectItem value="UPDATE">{t("announcements.filter_type_update")}</SelectItem>
                    <SelectItem value="EVENT">{t("announcements.filter_type_event")}</SelectItem>
                    <SelectItem value="MAINTENANCE">{t("announcements.filter_type_maintenance")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label className="text-muted-foreground">{t("announcements.form_is_pinned")}</Label>
                <Switch
                  checked={formData.isPinned}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPinned: checked })}
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label className="text-muted-foreground">{t("announcements.form_is_published")}</Label>
                <Switch
                  checked={formData.isPublished}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked, publishedAt: checked ? "" : formData.publishedAt })}
                />
              </div>
            </div>

            {/* Schedule Publish Date — only shown when not publishing immediately */}
            {!formData.isPublished && (
              <div>
                <Label className="mb-2 block text-muted-foreground">{t("announcements.form_published_at")}</Label>
                <Input
                  type="datetime-local"
                  value={formData.publishedAt}
                  onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingAnnouncement(null);
                  resetForm();
                }}
              >
                {t("announcements.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={Object.keys(formErrors).length > 0}
              >
                {editingAnnouncement
                  ? t("announcements.update_announcement")
                  : t("announcements.create_announcement")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <AlertDialog
        open={deleteAnnouncement !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteAnnouncement(null);
        }}
      >
        <AlertDialogContent>
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-rose-500 via-rose-400 to-orange-300" />
          <AlertDialogHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
              </div>
              <AlertDialogTitle className="text-rose-400">
                {t("announcements.delete_title")}
              </AlertDialogTitle>
            </div>
          </AlertDialogHeader>

          <div className="rounded-[12px] border border-border bg-background/60 p-4 space-y-2">
            <AlertDialogDescription>
              {t("announcements.delete_confirm")} {t("announcements.delete_confirm_undone")}
            </AlertDialogDescription>
            <div className="pt-2 space-y-1.5 text-sm">
              <div className="text-muted-foreground">
                {t("announcements.delete_name_label")}{" "}
                <span className="font-bold text-foreground">{deleteAnnouncement?.title}</span>
              </div>
              <div className="text-muted-foreground">
                {t("announcements.delete_type_label")}{" "}
                <code className="font-mono text-slate-200">{deleteAnnouncement?.type}</code>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("announcements.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => deleteAnnouncement && handleDelete(deleteAnnouncement.id)}
            >
              {t("announcements.action_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* VIEW DETAIL MODAL */}
      <Dialog
        open={viewingAnnouncement !== null}
        onOpenChange={(open) => {
          if (!open) setViewingAnnouncement(null);
        }}
      >

        <DialogContent className="max-w-3xl h-[90vh] max-h-[95vh] overflow-y-auto custom-scroll">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {t("announcements.detail_title")}
            </DialogTitle>
          </DialogHeader>
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-lg bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setViewingAnnouncement(null)}
              >
                &larr; {t("announcements.back")}
              </Button>
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium">
                {t("announcements.detail_subtitle")}
              </span>
            </div>
          </div>

          {viewingAnnouncement && (
            <div className="mt-4 space-y-6">
              {/* Title & Metadata */}
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {locale === "vi" ? viewingAnnouncement.titleVi : viewingAnnouncement.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge variant="outline" className={TYPE_BADGE_STYLES[viewingAnnouncement.type] || BADGE_BASE_CLASS}>
                    {viewingAnnouncement.type}
                  </Badge>
                  <Badge variant="outline" className={STATUS_BADGE_STYLES[getStatus(viewingAnnouncement)] || BADGE_BASE_CLASS}>
                    {t(`announcements.status_${getStatus(viewingAnnouncement).toLowerCase()}`)}
                  </Badge>
                  {viewingAnnouncement.isPinned && (
                    <Badge variant="outline" className={`${BADGE_BASE_CLASS} border-yellow-500/70 bg-yellow-500/10 text-yellow-300`}>
                      {t("announcements.filter_pinned")}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-2">
                    {t("announcements.by_author")} {viewingAnnouncement.author?.displayName || "Unknown"}
                  </span>
                </div>
              </div>

              {/* Time boxes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-[12px] border border-border bg-background/40 p-4">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium block mb-1">
                    {t("announcements.published_time")}
                  </span>
                  <span className="text-sm font-medium text-slate-200">
                    {viewingAnnouncement.publishedAt
                      ? new Date(viewingAnnouncement.publishedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")
                      : "—"}
                  </span>
                </div>
                <div className="rounded-[12px] border border-border bg-background/40 p-4">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium block mb-1">
                    {t("announcements.created_time")}
                  </span>
                  <span className="text-sm font-medium text-slate-200">
                    {new Date(viewingAnnouncement.createdAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
                  </span>
                </div>
                <div className="rounded-[12px] border border-border bg-background/40 p-4">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium block mb-1">
                    {t("announcements.updated_time")}
                  </span>
                  <span className="text-sm font-medium text-slate-200">
                    {new Date(viewingAnnouncement.updatedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
                  </span>
                </div>
              </div>

              {/* URL Slug */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium block">
                  {t("announcements.url_slug")}
                </span>
                <div className="rounded-[12px] border border-border bg-background/40 px-4 py-2.5 font-mono text-sm text-muted-foreground max-w-fit">
                  {locale === "vi" ? viewingAnnouncement.slugVi : viewingAnnouncement.slug}
                </div>
              </div>

              {/* Summary */}
              {((locale === "vi" && viewingAnnouncement.summaryVi) || (locale === "en" && viewingAnnouncement.summary)) && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium block">
                    {t("announcements.summary")}
                  </span>
                  <div className="rounded-[12px] border border-border bg-background/40 p-4 text-sm text-muted-foreground leading-relaxed">
                    {locale === "vi" ? viewingAnnouncement.summaryVi : viewingAnnouncement.summary}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium block">
                  {t("announcements.full_content")}
                </span>
                <div
                  className="rounded-[12px] border border-border bg-background/40 p-5 text-sm text-muted-foreground leading-relaxed ck-content ck-editor__editable"
                  dangerouslySetInnerHTML={{
                    __html: locale === "vi" ? viewingAnnouncement.contentVi : viewingAnnouncement.content
                  }}
                />
              </div>

              {/* Actions Footer */}
              <div className="flex items-center gap-3 pt-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setViewingAnnouncement(null)}
                  className="flex-1"
                >
                  {t("announcements.close")}
                </Button>
                <Button
                  onClick={() => {
                    const target = viewingAnnouncement;
                    setViewingAnnouncement(null);
                    openEditModal(target);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {t("announcements.action_edit")}
                </Button>
                <Button
                  onClick={() => {
                    const target = viewingAnnouncement;
                    setViewingAnnouncement(null);
                    setDeleteAnnouncement(target);
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("announcements.action_delete")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
