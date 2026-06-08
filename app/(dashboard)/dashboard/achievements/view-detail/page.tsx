"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile } from "@/lib/api/api-client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { ArrowLeft, Users, Pencil, Trash2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

const BADGE_BASE_CLASS = "rounded-[12px] uppercase tracking-[0.18em] text-[11px]";

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
                onClick={() => {
                  router.push(`/dashboard/achievements?edit=${achievement.id}`);
                }}
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
              <AlertDialogCancel>{t("achievements.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
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
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] custom-scroll">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />
            <DialogHeader>
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
            </DialogHeader>

            <ScrollArea className="max-h-[60vh]">
              {loadingUsers ? (
                <div className="rounded-[16px] border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
                  {t("achievements.loading_users")}
                </div>
              ) : achievementUsers.length > 0 ? (
                <div className="space-y-3">
                  {achievementUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-4 rounded-[16px] border border-slate-800 bg-slate-900/30 p-4 transition hover:border-slate-700"
                    >
                      <div className="h-12 w-12 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
                        <img
                          src={u.avatarUrl || "https://placehold.co/100x100?text=User"}
                          alt={u.displayName}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex flex-1 items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {u.displayName}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {t("achievements.profile_id_label")}: {u.id}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            {t("achievements.earned_date_label")}
                          </div>
                          <div className="mt-1 text-xs text-slate-300">
                            {u.earnedAt
                              ? new Date(u.earnedAt).toLocaleString()
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
      </main>
    </div>
  );
}
