"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Globe,
  Trophy,
  Timer,
  Percent,
  Crown,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GameResultSessionPlayer {
  gameProfileId: string;
  displayName: string;
  avatarUrl?: string;
  isAbsent: boolean;
  leftAt?: string;
}

interface GameResultSession {
  id: string;
  levelId: string;
  levelName: string;
  levelOrder: number;
  status: string;
  result?: string;
  completionTimeSec?: number;
  startedAt: string;
  endedAt?: string;
  players: GameResultSessionPlayer[];
}

interface GameResultPlayer {
  gameProfileId: string;
  displayName: string;
  avatarUrl?: string;
  isHost: boolean;
  joinedAt: string;
}

export interface GameResultDetail {
  id: string;
  lobbyCode?: string;
  lobbyName?: string;
  isPrivate: boolean;
  totalLevels: number;
  totalSessions: number;
  isCompleted: boolean;
  totalTimeSec?: number;
  startedAt: string;
  completedAt?: string;
  players: GameResultPlayer[];
  sessions: GameResultSession[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TOTAL_LEVELS = 5;

const AVATAR_COLORS = [
  "bg-orange-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-teal-500",
  "bg-indigo-500",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(totalSec?: number): string {
  if (!totalSec) return "—";
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatTimeOnly(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-card/30 dark:bg-[#0d0d1a] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground dark:text-gray-500 mb-1.5">
        {label}
      </div>
      <div className="text-sm font-semibold text-foreground dark:text-white">
        {children}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  colorClass,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  colorClass: string;
}) {
  return (
    <div className={`rounded-xl border px-4 py-4 text-center ${colorClass}`}>
      <Icon className="h-5 w-5 mx-auto mb-1.5 opacity-80" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[11px] mt-0.5 opacity-70">{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function PlayHistoryDetailModal({
  detail,
  open,
  onOpenChange,
  loading,
}: {
  detail: GameResultDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
}) {
  const { t } = useI18n();

  if (!detail && !loading) return null;

  const sortedSessions = detail
    ? [...detail.sessions].sort((a, b) => a.levelOrder - b.levelOrder)
    : [];

  const completedSessions = detail
    ? detail.sessions.filter((s) => s.result === "WIN").length
    : 0;
  const failedSessions = detail
    ? detail.sessions.filter((s) => s.result !== "WIN" && s.result).length
    : 0;
  const successRate = detail && detail.sessions.length > 0
    ? Math.round((completedSessions / TOTAL_LEVELS) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[92vh] p-0 overflow-hidden bg-background dark:bg-[#0a0a14] border-border dark:border-white/10 text-foreground dark:text-white">
        {/* Green top bar for completed, rose for abandoned, amber for in progress */}
        <div
          className={`absolute inset-x-0 top-0 h-[3px] ${
            detail?.isCompleted
              ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500"
              : detail?.completedAt
                ? "bg-gradient-to-r from-rose-500 via-red-500 to-amber-500"
                : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400"
          }`}
        />

        <DialogTitle className="sr-only">
          {detail?.lobbyName ?? ""}
        </DialogTitle>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              {t("profile.play_history_tab.loading")}
            </div>
          </div>
        ) : detail ? (
          <ScrollArea className="max-h-[88vh]">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-card/50 dark:bg-white/5 border border-border dark:border-white/10">
                  <Globe className="h-6 w-6 text-muted-foreground dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground dark:text-white break-all break-words">
                    {detail.lobbyName || "—"}
                  </h3>
                  <p className="text-sm text-muted-foreground dark:text-gray-400 font-mono">
                    {detail.id.length > 12 ? detail.id.slice(0, 12) : detail.id}
                  </p>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <InfoCard label={t("profile.play_history_tab.detail.lobby_code")}>
                  <span className="font-mono">{detail.lobbyCode || "—"}</span>
                </InfoCard>
                <InfoCard label={t("profile.play_history_tab.detail.privacy")}>
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-emerald-400" />
                    {detail.isPrivate
                      ? t("profile.play_history_tab.detail.privacy_private")
                      : t("profile.play_history_tab.detail.privacy_public")}
                  </span>
                </InfoCard>
                <InfoCard label={t("profile.play_history_tab.detail.status")}>
                  <span
                    className={
                      detail.isCompleted
                        ? "text-emerald-400 font-semibold"
                        : detail.completedAt
                          ? "text-rose-400 font-semibold"
                          : "text-amber-400 font-semibold"
                    }
                  >
                    {detail.isCompleted
                      ? t("gameResults.status_completed")
                      : detail.completedAt
                        ? t("gameResults.status_abandoned")
                        : t("gameResults.status_in_progress")}
                  </span>
                </InfoCard>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <InfoCard label={t("profile.play_history_tab.detail.total_time")}>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground dark:text-gray-500" />
                    {formatTime(detail.totalTimeSec)}
                  </span>
                </InfoCard>
                <InfoCard label={t("profile.play_history_tab.detail.started")}>
                  {formatDateTime(detail.startedAt)}
                </InfoCard>
                <InfoCard label={t("profile.play_history_tab.detail.completed")}>
                  {detail.completedAt ? formatDateTime(detail.completedAt) : "—"}
                </InfoCard>
              </div>

              {/* Statistics */}
              <div className="mb-6">
                <h4 className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground dark:text-gray-500 font-semibold mb-3">
                  {t("profile.play_history_tab.detail.statistics")}
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  <StatCard
                    icon={Trophy}
                    value={completedSessions}
                    label={t("profile.play_history_tab.detail.stat_completed")}
                    colorClass="border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                  />
                  <StatCard
                    icon={XCircle}
                    value={failedSessions}
                    label={t("profile.play_history_tab.detail.stat_failed")}
                    colorClass="border-rose-500/30 bg-rose-500/5 text-rose-400"
                  />
                  <StatCard
                    icon={Timer}
                    value={formatTime(detail.totalTimeSec)}
                    label={t("profile.play_history_tab.detail.stat_duration")}
                    colorClass="border-violet-500/30 bg-violet-500/5 text-violet-400"
                  />
                  <StatCard
                    icon={Percent}
                    value={`${successRate}%`}
                    label={t("profile.play_history_tab.detail.stat_success")}
                    colorClass="border-purple-500/30 bg-purple-500/5 text-purple-400"
                  />
                </div>
              </div>

              {/* Team Members */}
              <div className="mb-6">
                <h4 className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground dark:text-gray-500 font-semibold mb-3">
                  {t("profile.play_history_tab.detail.team_members")} · {t("profile.play_history_tab.detail.players_count").replace("{count}", String(detail.players.length))}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {detail.players.map((player) => {
                    const avatarBg = getAvatarColor(player.displayName);
                    return (
                      <div
                        key={player.gameProfileId}
                        className="flex items-center gap-2 rounded-full border border-border dark:border-white/10 bg-card/30 dark:bg-white/5 pl-1 pr-3 py-1"
                      >
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarBg}`}
                        >
                          {player.displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground dark:text-white">
                          {player.displayName}
                        </span>
                        {player.isHost && (
                          <Crown className="h-3.5 w-3.5 text-amber-400" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Level Progress */}
              <div>
                <h4 className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground dark:text-gray-500 font-semibold mb-3">
                  {t("profile.play_history_tab.detail.level_progress")} · {t("profile.play_history_tab.detail.sessions_count").replace("{count}", String(sortedSessions.length))}
                </h4>
                <div className="space-y-2">
                  {sortedSessions.map((session) => {
                    const isWin = session.result === "WIN";
                    const isLoss = session.result === "LOSE";
                    const isAbandoned = session.result === "ABANDONED" || session.status === "ABANDONED";
                    const activePlayers = session.players
                      ? session.players.filter((p) => !p.isAbsent).length
                      : 0;
                    const leftPlayers = session.players
                      ? session.players.filter((p) => p.isAbsent).length
                      : 0;

                    return (
                      <div
                        key={session.id}
                        className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors ${
                          isWin
                            ? "border-emerald-500/20 bg-emerald-500/5"
                            : isLoss
                              ? "border-rose-500/20 bg-rose-500/5"
                              : isAbandoned
                                ? "border-amber-500/20 bg-amber-500/5"
                                : "border-border dark:border-white/10 bg-card/20 dark:bg-white/[0.02]"
                        }`}
                      >
                        {/* Level number */}
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            isWin
                              ? "bg-emerald-500/20 text-emerald-400"
                              : isLoss
                                ? "bg-rose-500/20 text-rose-400"
                                : isAbandoned
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-white/10 text-muted-foreground dark:text-gray-400"
                          }`}
                        >
                          {session.levelOrder}
                        </div>

                        {/* Level info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-foreground dark:text-white">
                            {(() => {
                              const key = `gameResults.level_names.${session.levelName}`;
                              const translated = t(key);
                              return translated !== key ? translated : session.levelName;
                            })()}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs">
                            {/* Result */}
                            {session.result === "WIN" ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">
                                  {t("profile.play_history_tab.detail.result_win")}
                                </span>
                              </span>
                            ) : session.result === "LOSE" ? (
                              <span className="flex items-center gap-1">
                                <XCircle className="h-3.5 w-3.5 text-rose-400" />
                                <span className="text-rose-400 font-semibold">
                                  {t("profile.play_history_tab.detail.result_loss")}
                                </span>
                              </span>
                            ) : session.result === "ABANDONED" || session.status === "ABANDONED" ? (
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                <span className="text-amber-400 font-semibold">
                                  {t("profile.play_history_tab.detail.result_abandoned")}
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground font-mono">—</span>
                            )}

                            {/* Duration */}
                            <span className="flex items-center gap-1 text-muted-foreground dark:text-gray-500">
                              <Clock className="h-3 w-3" />
                              {formatTime(session.completionTimeSec)}
                            </span>

                            {/* Active players */}
                            {session.players && session.players.length > 0 && (
                              <span className="flex items-center gap-1 text-muted-foreground dark:text-gray-500">
                                <Users className="h-3 w-3" />
                                {t("profile.play_history_tab.detail.active_players").replace("{count}", String(activePlayers))}
                                {leftPlayers > 0 && (
                                  <span className="text-rose-400">
                                    · {t("profile.play_history_tab.detail.players_left").replace("{count}", String(leftPlayers))}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Time + arrow */}
                        <div className="flex items-center gap-2 shrink-0 text-sm text-muted-foreground dark:text-gray-500">
                          {formatTimeOnly(session.startedAt)}
                          <ChevronRight className="h-4 w-4 opacity-40" />
                        </div>
                      </div>
                    );
                  })}

                  {sortedSessions.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border dark:border-white/10 p-8 text-center text-sm text-muted-foreground">
                      {t("profile.play_history_tab.no_runs")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
