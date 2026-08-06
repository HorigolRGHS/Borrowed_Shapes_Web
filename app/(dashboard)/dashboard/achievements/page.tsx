"use client";

import { useI18n } from "@/lib/i18/i18n-context";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { Plus, Search, Eye, Users, Pencil, Trash2, AlertTriangle, ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { AchievementDescriptionEditor } from "@/components/achievements/achievement-description-editor";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { MonthPicker } from "@/components/ui/month-picker";

const BADGE_BASE_CLASS = "rounded-[12px] uppercase tracking-[0.18em] text-[11px]";
const ITEMS_PER_PAGE = 6;

const getTypeBadgeClass = (type: string) => {
  const isPermanent = type === "PERMANENT";
  return isPermanent
    ? `${BADGE_BASE_CLASS} w-28 justify-center border-sky-500/70 bg-sky-500/10 text-sky-300`
    : `${BADGE_BASE_CLASS} w-28 justify-center border-amber-500/70 bg-amber-500/10 text-amber-300`;
};

interface Achievement {
  id: string;
  name: string;
  description?: string;
  criteriaCode: string;
  badgeImageUrl: string;
  type: string;
  seasonMonth?: string;
  expiresAt?: string;
  earnedCount?: number;
}
interface AchievementUser {
  id: string;
  profileId?: string;
  displayName: string;
  avatarUrl?: string;
  equippedFrameUrl?: string;
  earnedAt?: string;
}
export default function AchievementsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [deleteAchievement, setDeleteAchievement] = useState<Achievement | null>(null);
  const [achievementUsers, setAchievementUsers] = useState<AchievementUser[]>([]);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    criteriaCode: "",
    badgeImageUrl: "",
    type: "PERMANENT",
    seasonMonth: "",
    expiresAt: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formTouched, setFormTouched] = useState<Record<string, boolean>>({});
  const expiresRef = useRef<HTMLInputElement | null>(null);
  const isClosingRef = useRef(false);

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const createAchievementIdRef = useRef(crypto.randomUUID());

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("achievements.upload_too_large") || "File exceeds 5MB limit");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("achievements.upload_invalid_type") || "Invalid image type");
      return;
    }

    try {
      setIsUploadingImage(true);
      const achievementId = editingAchievement?.id ?? createAchievementIdRef.current;

      // 1. Get Presigned URL
      const uploadUrlRes = await axios.post("/api/achievements/admin/upload-url", {
        fileName: file.name,
        achievementId,
        fileSize: file.size,
        mimeType: file.type,
      });

      const uploadUrlData = uploadUrlRes.data ?? uploadUrlRes;
      if (!uploadUrlData?.success) {
        throw new Error(uploadUrlData?.message || "Failed to get upload URL");
      }

      const { uploadUrl, key, method, headers } = uploadUrlData.data;

      // 2. Upload file directly to R2
      const putRes = await fetch(uploadUrl, {
        method: method || "PUT",
        headers: headers || {
          "Content-Type": file.type,
        },
        body: file,
        credentials: "omit",
      });

      if (!putRes.ok) {
        const errorText = await putRes.text().catch(() => "");
        throw new Error(`R2 upload failed: ${putRes.status} ${errorText}`);
      }

      // 3. Confirm upload
      const confirmRes = await axios.post("/api/achievements/admin/confirm-upload", {
        achievementId,
        filePath: key,
        mimeType: file.type,
        fileSize: file.size,
        oldBadgeImageUrl: formData.badgeImageUrl || undefined,
      });

      const confirmData = confirmRes.data ?? confirmRes;
      if (confirmData?.success && confirmData?.data?.url) {
        const url = confirmData.data.url;
        setFormData((prev) => ({ ...prev, badgeImageUrl: url }));
        setFormErrors((prev) => {
          const copy = { ...prev };
          delete copy.badgeImageUrl;
          return copy;
        });
        toast.success(t("achievements.uploaded") || "Uploaded successfully");
      } else {
        throw new Error(confirmData?.message || "Upload confirmation failed");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      const message = err.response?.data?.message || t("achievements.upload_failed") || "Failed to upload image";
      toast.error(t(message) || message);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const validateField = (field: string, value: string, type?: string): string => {
    switch (field) {
      case "name":
        if (!value.trim()) return t("achievements.validation.name_required");
        if (value.trim().length < 2) return t("achievements.validation.name_min");
        if (value.trim().length > 100) return t("achievements.validation.name_max");
        return "";
      case "criteriaCode":
        if (!value.trim()) return t("achievements.validation.criteria_code_required");
        if (!/^[A-Z0-9_]+$/.test(value.trim())) return t("achievements.validation.criteria_code_invalid");
        if (value.trim().length > 50) return t("achievements.validation.criteria_code_max");
        return "";
      case "badgeImageUrl":
        if (!value.trim()) return t("achievements.validation.badge_url_required");
        return "";
      case "description": {
        const plainText = value.replace(/<[^>]*>/g, "");
        if (plainText.length > 500) return t("achievements.validation.description_max");
        return "";
      }
      case "seasonMonth":
        if ((type ?? formData.type) === "SEASONAL" && !value.trim()) return t("achievements.validation.season_month_required");
        return "";
      default:
        return "";
    }
  };

  const validateAllFields = (): boolean => {
    const errors: Record<string, string> = {};
    const touched: Record<string, boolean> = {};
    const fields = ["name", "criteriaCode", "badgeImageUrl", "description", "seasonMonth"];
    for (const field of fields) {
      touched[field] = true;
      const error = validateField(field, (formData as any)[field]);
      if (error) errors[field] = error;
    }
    setFormErrors(errors);
    setFormTouched(touched);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (field: string, value: string, extra?: Partial<typeof formData>) => {
    const next = { ...formData, [field]: value, ...extra };
    setFormData(next);
    if (formTouched[field]) {
      const error = validateField(field, value, next.type);
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
    fetchAchievements();
  }, [typeFilter, sortBy, sortOrder, currentPage]);

  // Handle edit query param from view-detail page
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;

    const openEdit = async () => {
      // Try to find in current page first
      let achievement = achievements.find((a) => a.id === editId);

      // If not found in current page, fetch from detail API
      if (!achievement) {
        try {
          const response = await axios.get(`/api/achievements/detail/${editId}`);
          if (response.data?.success) {
            achievement = response.data.data;
          }
        } catch (error) {
          console.error("Failed to fetch achievement for edit:", error);
        }
      }

      if (achievement) {
        openEditModal(achievement);
        // Clean the URL
        router.replace("/dashboard/achievements", { scroll: false });
      }
    };

    openEdit();
  }, [searchParams, achievements]);

  const fetchAchievements = async () => {
    try {
      const response = await axios.get("/api/achievements/list", {
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          type: typeFilter,
          q: searchQuery,
          sortBy: sortBy === "default" ? undefined : sortBy,
          order: sortOrder,
        },
      });

      if (response.data?.success) {
        const payload = response.data.data;
        setAchievements(payload.items || []);
        setTotalPages(payload.totalPages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchAchievements();
    }
  };

  const handleCreate = async () => {
    if (!validateAllFields()) return;
    try {
      const payload = buildPayload(false);
      const response = await axios.post("/api/achievements/create", payload);
      if (response.data?.success) {
        toast.success(t("achievements.create_success"));
      } else {
        const message = response.data?.message || t("achievements.create_failed");
        toast.error(t(message) || message);
        return;
      }
      setShowCreateModal(false);
      resetForm();
      fetchAchievements();
    } catch (error: any) {
      console.error("Failed to create achievement:", error);
      const message = error.response?.data?.message || t("achievements.create_failed");
      toast.error(t(message) || message);
    }
  };

  const handleEdit = async () => {
    if (!editingAchievement) return;
    if (!validateAllFields()) return;

    try {
      const payload = buildPayload(true);

      const response = await axios.put(
        `/api/achievements/update/${editingAchievement.id}`,
        payload
      );

      if (response.data?.success) {
        toast.success(t("achievements.update_success"));
      } else {
        const message = response.data?.message || t("achievements.update_failed");
        toast.error(t(message) || message);
        return;
      }

      setEditingAchievement(null);
      setShowCreateModal(false);
      resetForm();
      fetchAchievements();
    } catch (error: any) {
      console.error("Failed to update achievement:", error);
      const message = error.response?.data?.message || t("achievements.update_failed");
      toast.error(t(message) || message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await axios.delete(`/api/achievements/delete/${id}`);
      if (response.data?.success) {
        toast.success(t("achievements.delete_success"));
      } else {
        const message =
          response.data?.message || t("achievements.delete_failed");

        toast.error(t(message) || message);
        return;
      }
      fetchAchievements();
      setDeleteAchievement(null);
    } catch (error: any) {
      console.error("Failed to delete achievement:", error);
      const message =
        error.response?.data?.message || t("achievements.delete_failed");
      toast.error(t(message) || message);
    }
  };
  const handleViewUsers = async (achievement: Achievement) => {
    try {
      setSelectedAchievement(achievement);
      setShowUsersModal(true);
      setLoadingUsers(true);

      const response = await axios.get(
        `/api/achievements/${achievement.id}/users`
      );

      if (response.data?.success) {
        setAchievementUsers(response.data.data || []);
      } else {
        toast.error(
          t(response.data?.message || "achievements.users_loaded_failed")
        );
      }
    } catch (error: any) {
      console.error("Failed to fetch achievement users:", error);

      const message =
        error.response?.data?.message ||
        "achievements.users_loaded_failed";

      toast.error(t(message));
    } finally {
      setLoadingUsers(false);
    }
  };
  const resetForm = () => {
    createAchievementIdRef.current = crypto.randomUUID();
    setFormData({
      name: "",
      description: "",
      criteriaCode: "",
      badgeImageUrl: "",
      type: "PERMANENT",
      seasonMonth: "",
      expiresAt: "",
    });
    setFormErrors({});
    setFormTouched({});
  };

  const buildPayload = (isEdit: boolean) => ({
    ...formData,
    ...(isEdit ? {} : { id: createAchievementIdRef.current }),
    seasonMonth:
      formData.type === "SEASONAL" && formData.seasonMonth
        ? formData.seasonMonth
        : null,
    expiresAt:
      formData.type === "SEASONAL" && formData.seasonMonth
        ? (() => {
          const [year, month] = formData.seasonMonth.split("-").map(Number);
          const lastDay = new Date(year, month, 0);
          lastDay.setHours(23, 59, 59, 999);
          return lastDay.toISOString();
        })()
        : null,
  });

  const openEditModal = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setFormData({
      name: achievement.name,
      description: achievement.description || "",
      criteriaCode: achievement.criteriaCode,
      badgeImageUrl: achievement.badgeImageUrl,
      type: achievement.type,
      seasonMonth: achievement.seasonMonth
        ? achievement.seasonMonth.slice(0, 7) : "",
      expiresAt: formatDateTimeLocal(achievement.expiresAt),
    });
  };
  const getEndOfMonthDateTime = (yearMonth: string) => {
    if (!yearMonth) return "";
    const [year, month] = yearMonth.split("-").map(Number);
    const lastDay = new Date(year, month, 0);
    lastDay.setHours(23, 59, 0, 0);
    const offset = lastDay.getTimezoneOffset();
    const localDate = new Date(
      lastDay.getTime() - offset * 60000
    );

    return localDate.toISOString().slice(0, 16);
  };
  const formatDateTimeLocal = (value?: string) => {
    if (!value) return "";

    try {
      const date = new Date(value);

      const offset = date.getTimezoneOffset();

      const localDate = new Date(
        date.getTime() - offset * 60000
      );

      return localDate.toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };
  const paginatedAchievements = achievements;

  useEffect(() => {
    if (currentPage > 1 && paginatedAchievements.length === 0) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [achievements, currentPage, totalPages, paginatedAchievements.length]);

  const renderPaginationItems = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis-start");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i > 1 && i < totalPages) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis-end");
      }

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



  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("achievements.management_title")}</h1>
          <p className="text-muted-foreground mt-2">{t("achievements.management_subtitle")}</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingAchievement(null);
            setShowCreateModal(true);
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white self-start md:self-auto animate-in fade-in"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("achievements.create_achievement")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Filter bar: Search + Type filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyUp={handleSearch}
                  placeholder={t("achievements.search_placeholder")}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("achievements.all_types")}</SelectItem>
                  <SelectItem value="permanent">{t("achievements.permanent")}</SelectItem>
                  <SelectItem value="seasonal">{t("achievements.seasonal")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(val) => {
                setSortBy(val);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t("achievements.sort_default")}</SelectItem>
                  <SelectItem value="name">{t("achievements.sort_by_name")}</SelectItem>
                  <SelectItem value="date">{t("achievements.sort_by_date")}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
                  setCurrentPage(1);
                }}
                title={sortOrder === "ASC" ? t("achievements.sort_ascending") : t("achievements.sort_descending")}
              >
                {sortOrder === "ASC" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-[12px] border border-border bg-card p-12 text-center text-muted-foreground">{t("achievements.loading_achievements")}</div>
          ) : (
            <>
              {/* Table */}
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{t("achievements.col_achievement")}</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{t("achievements.col_criteria_code")}</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{t("achievements.col_type_season")}</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{t("achievements.col_expiration")}</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium text-center">{t("achievements.col_total_earned")}</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium text-center">{t("achievements.col_actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAchievements.length > 0 ? (
                      paginatedAchievements.map((achievement) => (
                        <TableRow key={achievement.id} className="border-border hover:bg-muted/50">
                          {/* Achievement: image + name */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
                                <img
                                  src={achievement.badgeImageUrl}
                                  alt={achievement.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <span 
                                className="font-medium text-foreground truncate max-w-[120px] sm:max-w-[200px] block"
                                title={achievement.name}
                              >
                                {achievement.name}
                              </span>
                            </div>
                          </TableCell>
                          {/* Criteria Code */}
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`${BADGE_BASE_CLASS} border-amber-500/60 bg-amber-500/10 text-amber-300 truncate max-w-[120px] sm:max-w-[150px] inline-block align-bottom`}
                              title={achievement.criteriaCode}
                            >
                              {achievement.criteriaCode}
                            </Badge>
                          </TableCell>
                          {/* Type / Season */}
                          <TableCell>
                            <div className="flex flex-col items-start gap-1">
                              <Badge variant="outline" className={getTypeBadgeClass(achievement.type)}>
                                {achievement.type === "PERMANENT"
                                  ? t("achievements.permanent")
                                  : t("achievements.seasonal")}
                              </Badge>
                              {achievement.type === "SEASONAL" && achievement.seasonMonth && (
                                <span className="text-xs text-muted-foreground w-28 text-center">
                                  {achievement.seasonMonth.slice(0, 10)}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          {/* Expiration */}
                          <TableCell className="text-muted-foreground">
                            {achievement.expiresAt
                              ? new Date(achievement.expiresAt).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          {/* Total earned */}
                          <TableCell className="text-center font-semibold text-foreground">
                            {achievement.earnedCount ?? 0}
                          </TableCell>
                          {/* Actions dropdown */}
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={() => router.push(`/dashboard/achievements/view-detail?id=${achievement.id}`)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  {t("achievements.action_view_detail")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleViewUsers(achievement)}
                                  className="cursor-pointer"
                                >
                                  <Users className="mr-2 h-4 w-4" />
                                  {t("achievements.action_view_users")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openEditModal(achievement)}
                                  className="cursor-pointer"
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  {t("achievements.edit_button")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteAchievement(achievement)}
                                  className="cursor-pointer text-rose-400 focus:text-rose-400"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t("achievements.delete_button")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          {t('achievements.no_achievements')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {achievements.length > 0 && (
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
                      >
                        {t("pagination.previous")}
                      </PaginationPrevious>
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
                      >
                        {t("pagination.next")}
                      </PaginationNext>
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
        open={showCreateModal || editingAchievement !== null}
        onOpenChange={(open) => {
          if (!open) {
            isClosingRef.current = true;
            setShowCreateModal(false);
            setEditingAchievement(null);
            resetForm();
            setTimeout(() => { isClosingRef.current = false; }, 0);
          }
        }}
      >
        <DialogContent className="max-w-3xl h-[85vh] max-h-[90vh] overflow-y-auto custom-scroll">
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-lg bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
          <DialogHeader>
            <DialogTitle>
              {editingAchievement ? t('achievements.edit_achievement') : t('achievements.create_achievement')}
            </DialogTitle>
            <DialogDescription>
              {t('achievements.create_edit_subtitle')}
            </DialogDescription>
          </DialogHeader>
          <form
            key={
              editingAchievement
                ? `edit-${editingAchievement.id}`
                : `create-${showCreateModal}`
            }
            onSubmit={(e) => {
              e.preventDefault();
              editingAchievement ? handleEdit() : handleCreate();
            }}
            className="space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-muted-foreground">{t('achievements.name_label')}</Label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  onBlur={() => handleFieldBlur("name")}
                  className={formTouched.name && formErrors.name ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                />
                {formTouched.name && formErrors.name && (
                  <p className="mt-1.5 text-xs text-rose-400">{formErrors.name}</p>
                )}
              </div>
              <div>
                <Label className="mb-2 block text-muted-foreground">{t('achievements.criteria_code_label')}</Label>
                <Input
                  type="text"
                  value={formData.criteriaCode}
                  onChange={(e) => handleFieldChange("criteriaCode", e.target.value)}
                  onBlur={() => handleFieldBlur("criteriaCode")}
                  className={formTouched.criteriaCode && formErrors.criteriaCode ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                />
                {formTouched.criteriaCode && formErrors.criteriaCode && (
                  <p className="mt-1.5 text-xs text-rose-400">{formErrors.criteriaCode}</p>
                )}
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-muted-foreground">{t('achievements.description_label')}</Label>
              <AchievementDescriptionEditor
                data={formData.description}
                onChange={(data) => handleFieldChange("description", data)}
                onBlur={() => handleFieldBlur("description")}
              />
              {formTouched.description && formErrors.description && (
                <p className="mt-1.5 text-xs text-rose-400">{formErrors.description}</p>
              )}
            </div>
             <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-muted-foreground">{t('achievements.badge_url_label')}</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-dashed border-muted-foreground/30 hover:border-amber-500/50 hover:bg-amber-500/5"
                  >
                    {isUploadingImage ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                        {t("achievements.uploading")}
                      </span>
                    ) : (
                      t("achievements.choose_badge_image")
                    )}
                  </Button>
                </div>
                {formTouched.badgeImageUrl && formErrors.badgeImageUrl && (
                  <p className="mt-1.5 text-xs text-rose-400">{formErrors.badgeImageUrl}</p>
                )}
                {formData.badgeImageUrl && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm text-muted-foreground">
                      {t("achievements.preview")}
                    </p>
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[12px] border border-amber-500/30 bg-card">
                      <img
                        key={formData.badgeImageUrl}
                        src={formData.badgeImageUrl}
                        alt="Badge Preview"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://placehold.co/96x96?text=No+Image";
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label className="mb-2 block text-muted-foreground">{t('achievements.type_label')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => {
                    const next = {
                      ...formData,
                      type: value,
                      seasonMonth: value === 'SEASONAL' ? formData.seasonMonth : '',
                      expiresAt: value === 'SEASONAL' ? formData.expiresAt : '',
                    };
                    setFormData(next);
                    if (value !== 'SEASONAL') {
                      setFormErrors((prev) => { const copy = { ...prev }; delete copy.seasonMonth; return copy; });
                    } else if (formTouched.seasonMonth) {
                      const err = validateField('seasonMonth', next.seasonMonth, value);
                      setFormErrors((prev) => {
                        const copy = { ...prev };
                        if (err) copy.seasonMonth = err; else delete copy.seasonMonth;
                        return copy;
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERMANENT">{t('achievements.permanent')}</SelectItem>
                    <SelectItem value="SEASONAL">{t('achievements.seasonal')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className={formData.type === 'SEASONAL' ? 'relative' : 'hidden'}>
                <Label className="mb-2 block text-muted-foreground">{t('achievements.season_month_label')}</Label>
                <MonthPicker
                  value={formData.seasonMonth}
                  onChange={(val) => {
                    handleFieldChange("seasonMonth", val, { expiresAt: getEndOfMonthDateTime(val) });
                  }}
                  onBlur={() => handleFieldBlur("seasonMonth")}
                  className={formTouched.seasonMonth && formErrors.seasonMonth ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                />
                {formTouched.seasonMonth && formErrors.seasonMonth && (
                  <p className="mt-1.5 text-xs text-rose-400">{formErrors.seasonMonth}</p>
                )}
                {formData.seasonMonth && (
                  <div className="mt-2 text-sm text-foreground">{t('achievements.selected_label')} {formData.seasonMonth}</div>
                )}
              </div>
              {formData.type === 'SEASONAL' && (
                <div className="relative">
                  <Label className="mb-2 block text-muted-foreground">{t('achievements.expires_at_label')}</Label>
                  <Input
                    disabled
                    ref={expiresRef}
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingAchievement(null);
                  resetForm();
                }}
              >
                {t("achievements.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={Object.keys(formErrors).length > 0}
              >
                {editingAchievement
                  ? t("achievements.update_achievement")
                  : t("achievements.create_achievement")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <AlertDialog
        open={deleteAchievement !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteAchievement(null);
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
                {t("achievements.delete_achievement_title")}
              </AlertDialogTitle>
            </div>
          </AlertDialogHeader>

          <div className="rounded-[12px] border border-border bg-background/60 p-4 space-y-2">
            <AlertDialogDescription>
              {t("achievements.delete_confirm")} {t("achievements.delete_confirm_undone")}
            </AlertDialogDescription>
            <div className="pt-2 space-y-1.5 text-sm">
              <div className="text-muted-foreground">
                {t("achievements.delete_name_label")}{" "}
                <span className="font-bold text-foreground">{deleteAchievement?.name}</span>
              </div>
              <div className="text-muted-foreground">
                {t("achievements.delete_code_label")}{" "}
                <code className="font-mono text-slate-200">{deleteAchievement?.criteriaCode}</code>
              </div>
              <div className="text-muted-foreground">
                {t("achievements.delete_earned_by_label")}{" "}
                <span className="font-bold text-foreground">{deleteAchievement?.earnedCount ?? 0} {t("achievements.delete_players")}</span>
              </div>
            </div>
            {(deleteAchievement?.earnedCount ?? 0) > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-[8px] border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-xs text-amber-300/90 leading-5">
                  {t("achievements.delete_permanent_warning")}
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("achievements.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => deleteAchievement && handleDelete(deleteAchievement.id)}
            >
              {t("achievements.delete_button")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* USERS MODAL */}
      <Dialog
        open={showUsersModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowUsersModal(false);
            setAchievementUsers([]);
            setSelectedAchievement(null);
            setUserSearchQuery("");
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] custom-scroll">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />
          <DialogHeader>
            <div className="flex items-center gap-3">
              {selectedAchievement?.badgeImageUrl && (
                <div className="relative h-12 w-12 shrink-0">
                  <div className="h-12 w-12 overflow-hidden rounded-xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/20 to-orange-500/10 shadow-lg shadow-amber-500/10">
                    <img src={selectedAchievement.badgeImageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="absolute -inset-[1px] rounded-xl ring-1 ring-amber-400/30 pointer-events-none" />
                </div>
              )}
              <div>
                <DialogTitle>
                  {t("achievements.users_with")}{" "}
                  <span className="text-amber-300">
                    &quot;{selectedAchievement?.name}&quot;
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {achievementUsers.length}{" "}
                  {achievementUsers.length === 1
                    ? t("achievements.player_earned_single")
                    : t("achievements.players_earned_plural")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Search */}
          <div className="relative max-w-sm">
            <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-muted-foreground">
              <Search className="h-4 w-4" />
            </span>
            <Input
              type="text"
              placeholder={t("achievements.users_search_placeholder")}
              className="pl-10"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
            />
          </div>

          <ScrollArea className="max-h-[55vh]">
            {loadingUsers ? (
              <div className="rounded-[12px] border border-border bg-slate-900/40 p-8 text-center text-muted-foreground">
                {t("achievements.loading_users")}
              </div>
            ) : achievementUsers.length > 0 ? (
              <div className="rounded-[12px] border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{t("achievements.users_col_player")}</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{t("achievements.users_col_profile_id")}</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{t("achievements.users_col_earned_date")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {achievementUsers
                      .filter((u) => {
                        if (!userSearchQuery) return true;
                        const q = userSearchQuery.toLowerCase();
                        return u.displayName.toLowerCase().includes(q);
                      })
                      .map((u) => {
                        const initials = u.displayName.charAt(0).toUpperCase();
                        return (
                          <TableRow key={u.id} className="border-border hover:bg-muted/50">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <AvatarWithFrame
                                  displayName={u.displayName}
                                  avatarUrl={u.avatarUrl}
                                  badgeImageUrl={u.equippedFrameUrl}
                                  size="sm"
                                />
                                <span className="font-medium text-foreground">{u.displayName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground font-mono">{u.profileId ?? u.id}</div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {u.earnedAt
                                ? new Date(u.earnedAt).toLocaleDateString()
                                : t("achievements.unknown")}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-[12px] border border-border bg-slate-900/40 p-8 text-center text-muted-foreground">
                {t("achievements.no_users_found")}
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUsersModal(false);
                setAchievementUsers([]);
                setSelectedAchievement(null);
                setUserSearchQuery("");
              }}
            >
              {t("achievements.users_close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
