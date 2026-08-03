"use client";

import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/i18/i18n-context";
import { api, syncProfile, getUserProfile } from "@/lib/api/api-client";
import { toast } from "react-toastify";
import {
  Trophy,
  Star,
  Zap,
  Search,
  Lock,
  Calendar,
  X,
  Compass,
  Clock,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import axios from "axios";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ShowcaseAchievement {
  id: string;
  name: string;
  description?: string;
  criteriaCode: string;
  badgeImageUrl: string;
  type: string;
  seasonMonth?: string;
  expiresAt?: string;
  owned: boolean;
  achievedAt: string | null;
  equippable: boolean;
}

interface SeasonGroup {
  seasonKey: string;
  expiresAt: string | null;
  isActive: boolean;
  achievements: ShowcaseAchievement[];
}

interface ShowcaseData {
  permanent: ShowcaseAchievement[];
  seasonal: SeasonGroup[];
  stats: {
    totalEarned: number;
    permanentEarned: number;
    seasonalEarned: number;
  };
}

type FilterTab = "all" | "permanent" | "seasonal";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "—";
  }
}

function formatSeasonMonth(seasonMonthStr?: string | null): string {
  if (!seasonMonthStr) return "—";
  try {
    const parts = seasonMonthStr.split("-");
    if (parts.length >= 2) {
      return `${parts[1]}/${parts[0]}`; // MM/YYYY
    }
    return seasonMonthStr;
  } catch {
    return "—";
  }
}

function formatUTCDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "—";
  }
}

function formatSeasonLabel(seasonKey: string, expiresAt: string | null, isActive: boolean, t: (k: string) => string): string {
  const formattedSeason = formatSeasonMonth(seasonKey);
  const label = `${t("profile.achievements.season_label")} ${formattedSeason}`;
  if (!isActive) {
    return `${label} (${t("profile.achievements.expired_label").toLowerCase()})`;
  }
  return label;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCard({ icon: Icon, value, label, color }: {
  icon: React.ElementType;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={`w-5 h-5 ${color}`} />
      <div>
        <span className="text-2xl font-bold text-foreground dark:text-white">{value}</span>
        <p className="text-xs text-muted-foreground dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function AchievementCard({
  achievement,
  isEquipped,
  onClick,
}: {
  achievement: ShowcaseAchievement;
  isEquipped: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();
  const isExpiredOwned = achievement.owned && !achievement.equippable && achievement.type === "SEASONAL";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`
        cursor-pointer group relative flex flex-col min-w-0 rounded-xl border-2 p-4 text-left transition-all duration-300
        ${isEquipped
          ? "border-amber-500 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
          : achievement.owned && !isExpiredOwned
            ? "border-amber-500/30 bg-card hover:border-amber-500/60 dark:bg-card/40 dark:hover:bg-card/60 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]"
            : "border-border/30 dark:border-white/5 bg-muted/20 dark:bg-card/20 hover:bg-muted/35 dark:hover:bg-card/30"
        }
      `}
    >
      {/* Equipped badge */}
      {isEquipped && (
        <div className="absolute -top-2.5 right-3 z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black shadow-lg">
            ⭐ {t("profile.achievements.equipped_badge")}
          </span>
        </div>
      )}

      {/* Badge image */}
      <div className={`
        relative mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-xl
        ${achievement.owned && !isExpiredOwned
          ? "bg-gradient-to-br from-amber-500/10 to-orange-500/5"
          : ""
        }
      `}>
        <img
          src={achievement.badgeImageUrl}
          alt={achievement.name}
          className={`
            h-16 w-16 object-contain transition-all duration-300
            ${!achievement.owned
              ? "grayscale opacity-40"
              : isExpiredOwned
                ? "grayscale opacity-50"
                : "group-hover:scale-110"
            }
          `}
        />
        {/* Lock overlay for unowned */}
        {!achievement.owned && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/50 p-1.5">
              <Lock className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        )}
      </div>

      {/* Name */}
      <h4 
        title={achievement.name}
        className={`
        text-sm font-semibold leading-tight h-[35px] overflow-hidden break-all whitespace-normal w-full min-w-0
        ${!achievement.owned
          ? "text-muted-foreground/50 dark:text-gray-600"
          : isExpiredOwned
            ? "text-muted-foreground/70 dark:text-gray-500"
            : "text-foreground dark:text-white"
        }
      `}>
        {achievement.name}
      </h4>

      {/* Type badge + Season indicator */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={`
            text-[10px] uppercase tracking-wider px-1.5 py-0
            ${achievement.type === "PERMANENT"
              ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/5"
              : "border-amber-500/40 text-amber-400 bg-amber-500/5"
            }
          `}
        >
          {achievement.type === "PERMANENT"
            ? t("achievements.permanent")
            : t("achievements.seasonal")
          }
        </Badge>
        {isExpiredOwned && (
          <Badge
            variant="outline"
            className="text-[10px] uppercase tracking-wider px-1.5 py-0 border-red-500/40 text-red-400 bg-red-500/5"
          >
            {t("profile.achievements.expired_label")}
          </Badge>
        )}
        {achievement.type === "SEASONAL" && achievement.owned && achievement.equippable && (
          <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
            <Zap className="h-2.5 w-2.5" />
            S{achievement.seasonMonth?.slice(5, 7)}
          </span>
        )}
      </div>

      {/* Earned date */}
      {achievement.owned && (
        <p className={`mt-1.5 text-[11px] ${isExpiredOwned ? "text-gray-600" : "text-muted-foreground dark:text-gray-500"}`}>
          {formatDate(achievement.achievedAt)}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Detail Modal                                                       */
/* ------------------------------------------------------------------ */

function AchievementDetailModal({
  achievement,
  isEquipped,
  open,
  onOpenChange,
  onEquip,
  onUnequip,
  isEquipping,
}: {
  achievement: ShowcaseAchievement | null;
  isEquipped: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEquip: () => void;
  onUnequip: () => void;
  isEquipping: boolean;
}) {
  const { t } = useI18n();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserProfile(getUserProfile());
    }
  }, []);

  if (!achievement) return null;

  const isExpiredOwned = achievement.owned && !achievement.equippable && achievement.type === "SEASONAL";
  const canEquip = achievement.owned && achievement.equippable && !isEquipped;
  const canUnequip = isEquipped;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-background dark:bg-[#0a0a18] border-border dark:border-amber-500/20 text-foreground dark:text-white">


        {/* Top section with badge */}
        <div className="relative px-6 pt-8 pb-6 bg-gradient-to-b from-muted/50 to-transparent dark:from-[#0f1025] dark:to-transparent">
          <div className="absolute inset-0 bg-gradient-to-b from-sky-500/5 via-transparent to-transparent pointer-events-none" />
          <div className={`
            relative mx-auto flex h-28 w-28 items-center justify-center rounded-2xl
            ${achievement.owned && !isExpiredOwned
              ? "bg-transparent shadow-[0_0_30px_rgba(56,189,248,0.15)]"
              : "bg-transparent"
            }
          `}>
            <div className="absolute left-1/2 top-1/2 w-[72%] h-[72%] -translate-x-1/2 -translate-y-1/2 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 bg-muted border-2 border-border overflow-hidden z-0">
              {userProfile?.imgUrl ? (
                <img src={userProfile.imgUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <img
              src={achievement.badgeImageUrl}
              alt=""
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 z-10 w-full h-full object-contain drop-shadow-md ${
                !achievement.owned
                  ? "grayscale opacity-40"
                  : isExpiredOwned
                    ? "grayscale opacity-50"
                    : ""
              }`}
            />
          </div>

          <DialogTitle className={`mt-4 text-center text-xl font-bold break-all whitespace-normal ${
            !achievement.owned ? "text-muted-foreground" : "text-foreground dark:text-white"
          }`}>
            {achievement.name}
          </DialogTitle>

          {achievement.description && (
            <p className="mt-1.5 text-center text-sm text-muted-foreground dark:text-gray-400 leading-relaxed break-words whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: achievement.description }}
            />
          )}
          {!achievement.description && (
            <p className="mt-1.5 text-center text-sm text-muted-foreground dark:text-gray-500 italic">
              {t("achievements.no_description")}
            </p>
          )}
        </div>

        {/* Info rows */}
        <div className="px-6 pb-2 space-y-0">
          <div className="flex items-center justify-between py-3 border-b border-border dark:border-white/5">
            <span className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400">
              <Star className="h-4 w-4" />
              {t("profile.achievements.category_label")}
            </span>
            <Badge
              variant="outline"
              className={`
                text-xs uppercase tracking-wider
                ${achievement.type === "PERMANENT"
                  ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/5"
                  : "border-amber-500/40 text-amber-400 bg-amber-500/5"
                }
              `}
            >
              {achievement.type === "PERMANENT"
                ? t("achievements.permanent")
                : t("achievements.seasonal")
              }
            </Badge>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border dark:border-white/5">
            <span className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              {t("profile.achievements.earned_on")}
            </span>
            <span className={`text-sm font-medium ${achievement.owned ? "text-amber-400" : "text-gray-600"}`}>
              {achievement.owned
                ? formatDate(achievement.achievedAt)
                : t("profile.achievements.not_earned")
              }
            </span>
          </div>

          {achievement.type === "SEASONAL" && (
            <div className="flex items-center justify-between py-3 border-b border-border dark:border-white/5">
              <span className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400">
                <Compass className="h-4 w-4" />
                {t("profile.achievements.season_label")}
              </span>
              <span className="text-sm font-medium text-foreground dark:text-white">
                {formatSeasonMonth(achievement.seasonMonth)}
              </span>
            </div>
          )}

          {achievement.type === "SEASONAL" && (
            isExpiredOwned ? (
              <div className="flex items-center justify-between py-3 border-b border-border dark:border-white/5">
                <span className="flex items-center gap-2 text-sm text-red-500 dark:text-red-400">
                  <Zap className="h-4 w-4" />
                  {t("profile.achievements.expired_label")}
                </span>
                <span className="text-sm text-red-500 dark:text-red-400/80">
                  {formatUTCDate(achievement.expiresAt)}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between py-3 border-b border-border dark:border-white/5">
                <span className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400">
                  <Clock className="h-4 w-4" />
                  {t("profile.achievements.expires_label")}
                </span>
                <span className="text-sm font-medium text-foreground dark:text-white">
                  {formatUTCDate(achievement.expiresAt)}
                </span>
              </div>
            )
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 py-5">
          {canEquip && (
            <Button
              onClick={onEquip}
              disabled={isEquipping}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold h-11 text-sm"
            >
              <Star className="h-4 w-4 mr-2" />
              {t("profile.achievements.equip_button")}
            </Button>
          )}
          {canUnequip && (
            <Button
              onClick={onUnequip}
              disabled={isEquipping}
              variant="outline"
              className="flex-1 border-amber-500/50 text-amber-500 hover:bg-amber-500/10 h-11 text-sm"
            >
              {t("profile.achievements.unequip_button")}
            </Button>
          )}
          {!achievement.owned && (
            <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-border dark:border-gray-700 h-11 text-sm text-muted-foreground">
              <Lock className="h-3.5 w-3.5 mr-2" />
              {t("profile.achievements.locked")}
            </div>
          )}
          {isExpiredOwned && !isEquipped && (
            <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-red-500/20 h-11 text-sm text-red-400/60">
              {t("profile.achievements.equip_disabled_expired")}
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="px-6 h-11 text-sm border-border dark:border-white/10"
          >
            {t("profile.achievements.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function ProfileAchievements({ equippedAchievementId }: { equippedAchievementId?: string | null }) {
  const { t } = useI18n();
  const [data, setData] = useState<ShowcaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [selectedAchievement, setSelectedAchievement] = useState<ShowcaseAchievement | null>(null);
  const [isEquipping, setIsEquipping] = useState(false);
  const [localEquippedId, setLocalEquippedId] = useState<string | null>(equippedAchievementId ?? null);

  useEffect(() => {
    setLocalEquippedId(equippedAchievementId ?? null);
  }, [equippedAchievementId]);

  useEffect(() => {
    fetchShowcase();
  }, []);

  const fetchShowcase = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await axios.get("/api/achievements/user/me/showcase");
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEquip = async () => {
    if (!selectedAchievement) return;
    try {
      setIsEquipping(true);
      await api.patch("/account/profile", {
        equippedAchievementId: selectedAchievement.id,
      });
      setLocalEquippedId(selectedAchievement.id);
      await syncProfile();
      toast.success(t("profile.edit.success"));
      setSelectedAchievement(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("profile.edit.error"));
    } finally {
      setIsEquipping(false);
    }
  };

  const handleUnequip = async () => {
    try {
      setIsEquipping(true);
      await api.patch("/account/profile", {
        equippedAchievementId: null,
      });
      setLocalEquippedId(null);
      await syncProfile();
      toast.success(t("profile.edit.success"));
      setSelectedAchievement(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("profile.edit.error"));
    } finally {
      setIsEquipping(false);
    }
  };

  /* Filtering */
  const filteredPermanent = useMemo(() => {
    if (!data) return [];
    if (filter === "seasonal") return [];
    const query = search.toLowerCase().trim();
    return data.permanent.filter(
      (a) => !query || a.name.toLowerCase().includes(query)
    );
  }, [data, filter, search]);

  const filteredSeasonal = useMemo(() => {
    if (!data) return [];
    if (filter === "permanent") return [];
    const query = search.toLowerCase().trim();
    return data.seasonal
      .map((group) => ({
        ...group,
        achievements: group.achievements.filter(
          (a) => !query || a.name.toLowerCase().includes(query)
        ),
      }))
      .filter((g) => g.achievements.length > 0);
  }, [data, filter, search]);

  /* Equipped achievement for preview */
  const equippedAchievement = useMemo(() => {
    if (!data || !localEquippedId) return null;
    const found = data.permanent.find((a) => a.id === localEquippedId);
    if (found) return found;
    for (const group of data.seasonal) {
      const s = group.achievements.find((a) => a.id === localEquippedId);
      if (s) return s;
    }
    return null;
  }, [data, localEquippedId]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="rounded-2xl border border-border dark:border-white/10 bg-card/20 p-12 text-center">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          {t("achievements.loading_achievements")}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-border dark:border-white/10 border-dashed bg-card/20 p-12 text-center text-muted-foreground">
        {t("profile.achievements.error_loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border dark:border-white/10 bg-card/30 p-5">
        <StatCard
          icon={Trophy}
          value={data.stats.totalEarned}
          label={t("profile.achievements.total_earned")}
          color="text-amber-500"
        />
        <div className="h-8 w-px bg-border dark:bg-white/10 hidden sm:block" />
        <StatCard
          icon={Star}
          value={data.stats.permanentEarned}
          label={t("achievements.permanent")}
          color="text-emerald-400"
        />
        <div className="h-8 w-px bg-border dark:bg-white/10 hidden sm:block" />
        <StatCard
          icon={Zap}
          value={data.stats.seasonalEarned}
          label={t("achievements.seasonal")}
          color="text-amber-400"
        />

        {/* Equipped preview */}
        {equippedAchievement && (
          <>
            <div className="hidden sm:block flex-1" />
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2">
              <div className="relative h-12 w-12 flex items-center justify-center">
                <div className="absolute left-1/2 top-1/2 w-[72%] h-[72%] -translate-x-1/2 -translate-y-1/2 rounded-md bg-muted border-2 border-border overflow-hidden flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <img
                  src={equippedAchievement.badgeImageUrl}
                  alt={equippedAchievement.name}
                  className="pointer-events-none absolute inset-0 z-10 w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-500 font-semibold">
                  ⭐ {t("profile.achievements.equipped_badge")}
                </p>
                  <p 
                    className="text-sm font-medium text-foreground dark:text-white h-[40px] overflow-hidden break-all whitespace-normal"
                    title={equippedAchievement.name}
                  >
                  {equippedAchievement.name}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["all", "permanent", "seasonal"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`
                rounded-full px-4 py-1.5 text-sm font-medium transition-colors border border-border
                ${filter === tab
                  ? "bg-amber-500 text-black border-amber-500"
                  : "bg-muted/30 dark:bg-card/40 text-muted-foreground hover:bg-muted/80 dark:hover:bg-card/60 hover:text-foreground dark:hover:text-white"
                }
              `}
            >
              {tab === "all"
                ? t("profile.achievements.filter_all")
                : tab === "permanent"
                  ? t("achievements.permanent")
                  : t("achievements.seasonal")
              }
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("profile.achievements.search_placeholder")}
            className="pl-10 bg-card/30 border-border dark:border-white/10"
          />
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto pr-1.5 custom-scroll space-y-6">
        {/* Permanent section */}
        {filteredPermanent.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              <h3 className="text-base font-bold text-foreground dark:text-white">
                {t("profile.achievements.section_permanent")}
              </h3>
              <span className="text-sm text-muted-foreground dark:text-gray-500">
                {filteredPermanent.length}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredPermanent.map((ach) => (
                <AchievementCard
                  key={ach.id}
                  achievement={ach}
                  isEquipped={localEquippedId === ach.id}
                  onClick={() => setSelectedAchievement(ach)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Seasonal sections */}
        {filteredSeasonal.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              <h3 className="text-base font-bold text-foreground dark:text-white">
                {t("profile.achievements.section_seasonal")}
              </h3>
              <span className="text-sm text-muted-foreground dark:text-gray-500">
                {filteredSeasonal.reduce((acc, g) => acc + g.achievements.length, 0)}
              </span>
            </div>

            <div className="space-y-6">
              {filteredSeasonal.map((group) => (
                <div key={group.seasonKey} className="space-y-2">
                  <p className={`text-xs flex items-center gap-1.5 font-semibold ${group.isActive ? "text-amber-400" : "text-red-400/70"}`}>
                    <Zap className="h-3 w-3" />
                    {formatSeasonLabel(group.seasonKey, group.expiresAt, group.isActive, t)}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {group.achievements.map((ach) => (
                      <AchievementCard
                        key={ach.id}
                        achievement={ach}
                        isEquipped={localEquippedId === ach.id}
                        onClick={() => setSelectedAchievement(ach)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {filteredPermanent.length === 0 && filteredSeasonal.length === 0 && (
          <div className="rounded-2xl border border-border dark:border-white/10 border-dashed bg-card/20 p-12 text-center text-muted-foreground">
            {search
              ? t("achievements.no_achievements")
              : t("achievements.no_achievements")
            }
          </div>
        )}
      </div>

      {/* Detail modal */}
      <AchievementDetailModal
        achievement={selectedAchievement}
        isEquipped={localEquippedId === selectedAchievement?.id}
        open={!!selectedAchievement}
        onOpenChange={(open) => {
          if (!open) setSelectedAchievement(null);
        }}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
        isEquipping={isEquipping}
      />
    </div>
  );
}
