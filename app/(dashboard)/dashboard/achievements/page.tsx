"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile } from "@/lib/api/api-client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { Plus, Search, Eye, Users, Pencil, Trash2, AlertTriangle, ChevronDown } from "lucide-react";
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

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

const BADGE_BASE_CLASS = "rounded-[12px] uppercase tracking-[0.18em] text-[11px]";
const ITEMS_PER_PAGE = 6;

const getTypeBadgeClass = (type: string) => {
  const isPermanent = type === "PERMANENT";
  return isPermanent
    ? `${BADGE_BASE_CLASS} border-sky-500/70 bg-sky-500/10 text-sky-300`
    : `${BADGE_BASE_CLASS} border-amber-500/70 bg-amber-500/10 text-amber-300`;
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
  displayName: string;
  avatarUrl?: string;
  earnedAt?: string;
}
export default function AchievementsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [deleteAchievement, setDeleteAchievement] = useState<Achievement | null>(null);
  const [achievementUsers, setAchievementUsers] = useState<AchievementUser[]>([]);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
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

  const validateField = (field: string, value: string, type?: string): string => {
    switch (field) {
      case "name":
        if (!value.trim()) return t("achievements.validation.name_required");
        if (value.trim().length < 2) return t("achievements.validation.name_min");
        if (value.trim().length > 100) return t("achievements.validation.name_max");
        return "";
      case "criteriaCode":
        if (!value.trim()) return t("achievements.validation.criteria_code_required");
        if (!/^[a-zA-Z0-9_-]+$/.test(value.trim())) return t("achievements.validation.criteria_code_invalid");
        if (value.trim().length > 50) return t("achievements.validation.criteria_code_max");
        return "";
      case "badgeImageUrl":
        if (!value.trim()) return t("achievements.validation.badge_url_required");
        if (!/^https?:\/\/.+/.test(value.trim())) return t("achievements.validation.badge_url_invalid");
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
      fetchAchievements();
    }
  }, [router, typeFilter, sortBy, currentPage]);

  // Handle edit query param from view-detail page
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && achievements.length > 0) {
      const achievement = achievements.find((a) => a.id === editId);
      if (achievement) {
        openEditModal(achievement);
        // Clean the URL
        router.replace("/dashboard/achievements", { scroll: false });
      }
    }
  }, [searchParams, achievements]);

  const fetchAchievements = async () => {
    try {
      const response = await axios.get("/api/achievements/list", {
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          type: typeFilter,
          q: searchQuery,
          sortBy: sortBy,
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
      const payload = buildPayload();
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
      const payload = buildPayload();

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

  const buildPayload = () => ({
    ...formData,
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mb-8">
            <div className="mb-6 max-w-3xl">
              <h2 className="text-4xl font-bold text-white sm:text-2xl">{t("achievements.management_title")}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">{t("achievements.management_subtitle")}</p>
              <div className="mt-2 h-0.5 w-12 rounded-[12px] bg-amber-500" />
            </div>

            {/* Filter bar: Search + Type filter + Create button */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 items-center gap-3">
                <div className="relative flex-1 max-w-lg">
                  <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-slate-500">
                    <Search className="h-4 w-4" />
                  </span>
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyUp={handleSearch}
                    placeholder={t("achievements.search_placeholder")}
                    className="pl-10"
                  />
                </div>
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
              </div>
              <Button
                onClick={() => {
                  resetForm();
                  setEditingAchievement(null);
                  setShowCreateModal(true);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="h-4 w-4" />
                {t("achievements.create_achievement")}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-[12px] border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">{t("achievements.loading_achievements")}</div>
          ) : (
            <>
              {/* Table */}
              <div className="rounded-[12px] border border-slate-800 bg-slate-900/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">{t("achievements.col_achievement")}</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">{t("achievements.col_criteria_code")}</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">{t("achievements.col_type_season")}</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">{t("achievements.col_expiration")}</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium text-center">{t("achievements.col_total_earned")}</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium text-center">{t("achievements.col_actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAchievements.length > 0 ? (
                      paginatedAchievements.map((achievement) => (
                        <TableRow key={achievement.id} className="border-slate-800 hover:bg-slate-800/50">
                          {/* Achievement: image + name */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                                <img
                                  src={achievement.badgeImageUrl}
                                  alt={achievement.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <span className="font-medium text-white">{achievement.name}</span>
                            </div>
                          </TableCell>
                          {/* Criteria Code */}
                          <TableCell>
                            <Badge variant="outline" className={`${BADGE_BASE_CLASS} border-amber-500/60 bg-amber-500/10 text-amber-300`}>
                              {achievement.criteriaCode}
                            </Badge>
                          </TableCell>
                          {/* Type */}
                          <TableCell>
                            <Badge variant="outline" className={getTypeBadgeClass(achievement.type)}>
                              {achievement.type}
                            </Badge>
                          </TableCell>
                          {/* Expiration */}
                          <TableCell className="text-slate-400">
                            {achievement.expiresAt
                              ? new Date(achievement.expiresAt).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          {/* Total earned */}
                          <TableCell className="text-center font-semibold text-white">
                            {achievement.earnedCount ?? 0}
                          </TableCell>
                          {/* Actions dropdown */}
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
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
                        <TableCell colSpan={6} className="text-center py-12 text-slate-400">
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
        </main>
      </div>

      {/* Create/Edit Modal */}
      <Dialog
        open={showCreateModal || editingAchievement !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false);
            setEditingAchievement(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scroll">
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
                <Label className="mb-2 block text-slate-300">{t('achievements.name_label')}</Label>
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
                <Label className="mb-2 block text-slate-300">{t('achievements.criteria_code_label')}</Label>
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
              <Label className="mb-2 block text-slate-300">{t('achievements.description_label')}</Label>
              <CKEditor
                editor={ClassicEditor as any}
                data={formData.description}
                onChange={(event: any, editor: any) => {
                  const data = editor.getData();
                  handleFieldChange("description", data);
                }}
                onBlur={() => handleFieldBlur("description")}
                config={{
                  toolbar: [
                    'heading',
                    '|',
                    'bold',
                    'italic',
                    'underline',
                    'strikethrough',
                    'link',
                    'blockQuote',
                    'insertTable',
                    'bulletedList',
                    'numberedList',
                    '|',
                    'outdent',
                    'indent',
                    '|',
                    'undo',
                    'redo',
                    'removeFormat'
                  ]
                }}
              />
              {formTouched.description && formErrors.description && (
                <p className="mt-1.5 text-xs text-rose-400">{formErrors.description}</p>
              )}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-slate-300">{t('achievements.badge_url_label')}</Label>
                <Input
                  type="url"
                  value={formData.badgeImageUrl}
                  onChange={(e) => handleFieldChange("badgeImageUrl", e.target.value)}
                  onBlur={() => handleFieldBlur("badgeImageUrl")}
                  className={formTouched.badgeImageUrl && formErrors.badgeImageUrl ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                />
                {formTouched.badgeImageUrl && formErrors.badgeImageUrl && (
                  <p className="mt-1.5 text-xs text-rose-400">{formErrors.badgeImageUrl}</p>
                )}
                {formData.badgeImageUrl && !formErrors.badgeImageUrl && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm text-slate-400">
                      {t("achievements.preview")}
                    </p>
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[12px] border border-amber-500/30 bg-slate-900">
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
                <Label className="mb-2 block text-slate-300">{t('achievements.type_label')}</Label>
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
                <Label className="mb-2 block text-slate-300">{t('achievements.season_month_label')}</Label>
                <Input
                  type="month"
                  value={formData.seasonMonth}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleFieldChange("seasonMonth", value, { expiresAt: getEndOfMonthDateTime(value) });
                  }}
                  onBlur={() => handleFieldBlur("seasonMonth")}
                  className={formTouched.seasonMonth && formErrors.seasonMonth ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                />
                {formTouched.seasonMonth && formErrors.seasonMonth && (
                  <p className="mt-1.5 text-xs text-rose-400">{formErrors.seasonMonth}</p>
                )}
                {formData.seasonMonth && (
                  <div className="mt-2 text-sm text-slate-100">{t('achievements.selected_label')} {formData.seasonMonth}</div>
                )}
              </div>
              {formData.type === 'SEASONAL' && (
                <div className="relative">
                  <Label className="mb-2 block text-slate-300">{t('achievements.expires_at_label')}</Label>
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
            <div className="flex items-start gap-5">
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[16px] border border-rose-500/20 bg-rose-500/10">
                <AlertTriangle className="h-6 w-6 text-rose-400" />
              </div>
              <div className="flex-1">
                <AlertDialogTitle>
                  {t("achievements.delete_achievement_title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("achievements.delete_confirm")}
                </AlertDialogDescription>
                <p className="mt-2 max-w-lg text-[15px] leading-7 text-slate-500">
                  {t("achievements.delete_warning")}
                </p>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("achievements.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
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
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] custom-scroll">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />
          <DialogHeader>
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
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {loadingUsers ? (
              <div className="rounded-[16px] border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
                {t("achievements.loading_users")}
              </div>
            ) : achievementUsers.length > 0 ? (
              <div className="space-y-3">
                {achievementUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 rounded-[16px] border border-slate-800 bg-slate-900/30 p-4 transition hover:border-slate-700"
                  >
                    <div className="h-12 w-12 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
                      <img
                        src={
                          user.avatarUrl ||
                          "https://placehold.co/100x100?text=User"
                        }
                        alt={user.displayName}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="flex flex-1 items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {user.displayName}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {t("achievements.profile_id_label")}: {user.id}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          {t("achievements.earned_date_label")}
                        </div>

                        <div className="mt-1 text-xs text-slate-300">
                          {user.earnedAt
                            ? new Date(user.earnedAt).toLocaleString()
                            : t("achievements.unknown")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[16px] border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
                {t("achievements.no_users_found")}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
