"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile } from "@/lib/api/api-client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { ArrowLeft, Users, Pencil, Trash2, AlertTriangle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonthPicker } from "@/components/ui/month-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const BADGE_BASE_CLASS = "rounded-[12px] uppercase tracking-[0.18em] text-[11px]";

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
  displayName: string;
  avatarUrl?: string;
  earnedAt?: string;
}

export default function AchievementViewDetailPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const achievementId = searchParams.get("id");

  const [user, setUser] = useState<any>(null);
  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [achievementUsers, setAchievementUsers] = useState<AchievementUser[]>([]);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
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

  useEffect(() => {
    const profile = getUserProfile();
    if (!profile || profile.role !== "ADMIN") {
      router.push("/");
    } else {
      setUser(profile);
    }
  }, [router]);

  useEffect(() => {
    if (user && achievementId) {
      fetchAchievementDetail();
    }
  }, [user, achievementId]);

  const fetchAchievementDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/achievements/detail/${achievementId}`);
      if (response.data?.success) {
        setAchievement(response.data.data);
      } else {
        toast.error(t("achievements.not_found"));
        router.push("/dashboard/achievements");
      }
    } catch (error) {
      console.error("Failed to fetch achievement detail:", error);
      toast.error(t("achievements.not_found"));
      router.push("/dashboard/achievements");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!achievement) return;
    try {
      const response = await axios.delete(`/api/achievements/delete/${achievement.id}`);
      if (response.data?.success) {
        toast.success(t("achievements.delete_success"));
        router.push("/dashboard/achievements");
      } else {
        const message = response.data?.message || t("achievements.delete_failed");
        toast.error(t(message) || message);
      }
    } catch (error: any) {
      console.error("Failed to delete achievement:", error);
      const message = error.response?.data?.message || t("achievements.delete_failed");
      toast.error(t(message) || message);
    }
    setShowDeleteDialog(false);
  };

  const handleViewUsers = async () => {
    if (!achievement) return;
    try {
      setShowUsersModal(true);
      setLoadingUsers(true);
      const response = await axios.get(`/api/achievements/${achievement.id}/users`);
      if (response.data?.success) {
        setAchievementUsers(response.data.data || []);
      } else {
        toast.error(t(response.data?.message || "achievements.users_loaded_failed"));
      }
    } catch (error: any) {
      console.error("Failed to fetch achievement users:", error);
      const message = error.response?.data?.message || "achievements.users_loaded_failed";
      toast.error(t(message));
    } finally {
      setLoadingUsers(false);
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return "—";
    }
  };

  // --- Edit form helpers (matching list page pattern) ---
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

  const getEndOfMonthDateTime = (yearMonth: string) => {
    if (!yearMonth) return "";
    const [year, month] = yearMonth.split("-").map(Number);
    const lastDay = new Date(year, month, 0);
    lastDay.setHours(23, 59, 0, 0);
    const offset = lastDay.getTimezoneOffset();
    const localDate = new Date(lastDay.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
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

  const openEditModal = () => {
    if (!achievement) return;
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
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!achievement) return;
    if (!validateAllFields()) return;
    try {
      const payload = buildPayload();
      const response = await axios.put(
        `/api/achievements/update/${achievement.id}`,
        payload
      );
      if (response.data?.success) {
        toast.success(t("achievements.update_success"));
        setShowEditModal(false);
        resetForm();
        fetchAchievementDetail();
      } else {
        const message = response.data?.message || t("achievements.update_failed");
        toast.error(t(message) || message);
      }
    } catch (error: any) {
      console.error("Failed to update achievement:", error);
      const message = error.response?.data?.message || t("achievements.update_failed");
      toast.error(t(message) || message);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <main className="px-8 py-8">
          <div className="rounded-[12px] border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">
            {t("achievements.loading_achievements")}
          </div>
        </main>
      </div>
    );
  }

  if (!achievement) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="px-8 py-8 max-w-6xl mx-auto">
        {/* Back link */}
        <button
          onClick={() => router.push("/dashboard/achievements")}
          className="mb-6 flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("achievements.back_to_achievements")}
        </button>

        {/* Page title */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-white sm:text-2xl">
            {t("achievements.detail_page_title")}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {t("achievements.detail_page_subtitle")}{achievement.name}
          </p>
          <div className="mt-2 h-0.5 w-12 rounded-[12px] bg-amber-500" />
        </div>

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Left column - Badge card */}
          <div className="rounded-[16px] border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
            {/* Badge image */}
            <div className="relative mx-auto h-48 w-48 overflow-hidden rounded-[16px] border-2 border-amber-500/30 bg-slate-950">
              <img
                src={achievement.badgeImageUrl}
                alt={achievement.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "https://placehold.co/192x192?text=No+Image";
                }}
              />
            </div>

            {/* Name + type badge */}
            <h3 className="mt-4 text-center text-xl font-bold text-white">
              {achievement.name}
            </h3>
            <div className="mt-3 flex justify-center">
              <Badge variant="outline" className={getTypeBadgeClass(achievement.type)}>
                {achievement.type}
              </Badge>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full border-amber-500/40 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
                onClick={handleViewUsers}
              >
                <Users className="mr-2 h-4 w-4" />
                {t("achievements.view_users_button")}
              </Button>
              <Button
                variant="outline"
                className="w-full border-sky-500/40 text-sky-300 hover:bg-sky-500/10 hover:text-sky-200"
                onClick={openEditModal}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {t("achievements.edit_achievement_button")}
              </Button>
              <Button
                variant="outline"
                className="w-full border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("achievements.delete_achievement_button")}
              </Button>
            </div>
          </div>

          {/* Right column - Info */}
          <div className="rounded-[16px] border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
            <h3 className="mb-6 text-lg font-semibold text-white">
              {t("achievements.info_title")}
            </h3>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {t("achievements.achievement_id_label")}
                </div>
                <div className="mt-1 text-sm text-slate-200">{achievement.id}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {t("achievements.criteria_code_label")}
                </div>
                <div className="mt-1">
                  <Badge variant="outline" className={`${BADGE_BASE_CLASS} border-amber-500/60 bg-amber-500/10 text-amber-300`}>
                    {achievement.criteriaCode}
                  </Badge>
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {t("achievements.description_label")}
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-200">
                  {achievement.description
                    ? achievement.description.replace(/<[^>]*>/g, "")
                    : t("achievements.no_description")}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {t("achievements.type_label")}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-200">
                  {achievement.type}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {t("achievements.total_users_achieved_label")}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-200">
                  {achievement.earnedCount ?? 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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

            <div className="rounded-[12px] border border-slate-800 bg-slate-950/60 p-4 space-y-2">
              <AlertDialogDescription>
                {t("achievements.delete_confirm")} {t("achievements.delete_confirm_undone")}
              </AlertDialogDescription>
              <div className="pt-2 space-y-1.5 text-sm">
                <div className="text-slate-400">
                  {t("achievements.delete_name_label")}{" "}
                  <span className="font-bold text-white">{achievement.name}</span>
                </div>
                <div className="text-slate-400">
                  {t("achievements.delete_code_label")}{" "}
                  <code className="font-mono text-slate-200">{achievement.criteriaCode}</code>
                </div>
                <div className="text-slate-400">
                  {t("achievements.delete_earned_by_label")}{" "}
                  <span className="font-bold text-white">{achievement.earnedCount ?? 0} {t("achievements.delete_players")}</span>
                </div>
              </div>
              {(achievement.earnedCount ?? 0) > 0 && (
                <div className="mt-3 flex items-start gap-2 rounded-[8px] border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <p className="text-xs text-amber-300/90 leading-5">
                    {t("achievements.delete_permanent_warning")}
                  </p>
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>{t("achievements.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleDelete}
              >
                {t("achievements.delete_button")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Users Modal */}
        <Dialog
          open={showUsersModal}
          onOpenChange={(open) => {
            if (!open) {
              setShowUsersModal(false);
              setAchievementUsers([]);
              setUserSearchQuery("");
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] custom-scroll">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />
            <DialogHeader>
              <div className="flex items-center gap-3">
                {achievement.badgeImageUrl && (
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                    <img src={achievement.badgeImageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
                <div>
                  <DialogTitle>
                    {t("achievements.users_with")}{" "}
                    <span className="text-amber-300">
                      &quot;{achievement.name}&quot;
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
              <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-slate-500">
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
                <div className="rounded-[12px] border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
                  {t("achievements.loading_users")}
                </div>
              ) : achievementUsers.length > 0 ? (
                <div className="rounded-[12px] border border-slate-800 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">{t("achievements.users_col_player")}</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">{t("achievements.users_col_profile_id")}</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">{t("achievements.users_col_earned_date")}</TableHead>
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
                            <TableRow key={u.id} className="border-slate-800 hover:bg-slate-800/50">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/80 text-sm font-bold text-white">
                                    {initials}
                                  </div>
                                  <span className="font-medium text-white">{u.displayName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-slate-300">{u.id}</div>
                              </TableCell>
                              <TableCell className="text-slate-300 text-sm">
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
                <div className="rounded-[12px] border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
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
                  setUserSearchQuery("");
                }}
              >
                {t("achievements.users_close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog
          open={showEditModal}
          onOpenChange={(open) => {
            if (!open) {
              isClosingRef.current = true;
              setShowEditModal(false);
              resetForm();
              setTimeout(() => { isClosingRef.current = false; }, 0);
            }
          }}
        >
          <DialogContent className="max-w-2xl h-[85vh] max-h-[90vh] overflow-y-auto custom-scroll">
            <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-lg bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
            <DialogHeader>
              <DialogTitle>{t('achievements.edit_achievement')}</DialogTitle>
              <DialogDescription>{t('achievements.create_edit_subtitle')}</DialogDescription>
            </DialogHeader>
            <form
              key={`edit-${achievement.id}`}
              onSubmit={(e) => {
                e.preventDefault();
                handleEditSubmit();
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
                      'heading', '|',
                      'bold', 'italic', 'underline', 'strikethrough',
                      'link', 'blockQuote', 'insertTable',
                      'bulletedList', 'numberedList', '|',
                      'outdent', 'indent', '|',
                      'undo', 'redo', 'removeFormat'
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
                      <p className="mb-2 text-sm text-slate-400">{t("achievements.preview")}</p>
                      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[12px] border border-amber-500/30 bg-slate-900">
                        <img
                          key={formData.badgeImageUrl}
                          src={formData.badgeImageUrl}
                          alt="Badge Preview"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "https://placehold.co/96x96?text=No+Image";
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
                    isClosingRef.current = true;
                    setShowEditModal(false);
                    resetForm();
                    setTimeout(() => { isClosingRef.current = false; }, 0);
                  }}
                >
                  {t("achievements.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={Object.keys(formErrors).length > 0}
                >
                  {t("achievements.update_achievement")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
