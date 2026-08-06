"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useI18n } from "@/lib/i18/i18n-context";
import axios from "axios";
import {
  Users,
  Clock,
  ChevronDown,
  History,
  Gamepad2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PlayHistoryDetailModal,
  type GameResultDetail,
} from "@/components/profile/play-history-detail-modal";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GameResultPlayer {
  gameProfileId: string;
  displayName: string;
  avatarUrl?: string;
  isHost: boolean;
  joinedAt: string;
}

interface GameResult {
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
}

type SortMode = "newest" | "oldest" | "fastest";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ITEMS_PER_PAGE = 10;
const TOTAL_LEVELS = 5;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

function formatRunDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function generateRunId(id: string, startedAt: string): string {
  const d = new Date(startedAt);
  const year = d.getFullYear();
  const seq = id.slice(-3).toUpperCase();
  return `RUN-${year}-${seq}`;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function PlayHistory() {
  const { t } = useI18n();

  // List state
  const [runs, setRuns] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [sortMode, setSortMode] = useState<SortMode>("newest");

  // Detail modal state
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GameResultDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /* ── Fetch runs ─────────────────────────────────────────── */

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("/api/game-results/user/me", {
        params: {
          page,
          limit: ITEMS_PER_PAGE,
          sort: sortMode === "newest" ? "newest" : sortMode === "oldest" ? "oldest" : "fastest",
        },
      });

      const payload = res.data;

      // Backend may wrap in { success, data } or return directly
      let data: any;
      if (payload?.success && payload?.data) {
        data = payload.data;
      } else if (payload?.items) {
        data = payload;
      } else {
        data = { items: [] };
      }

      setRuns(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      console.error("Failed to fetch play history:", err);
      setError(t("profile.play_history_tab.error"));
    } finally {
      setLoading(false);
    }
  }, [page, sortMode, t]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  /* ── Fetch detail ───────────────────────────────────────── */

  const openDetail = async (runId: string) => {
    setSelectedRunId(runId);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await axios.get(`/api/game-results/detail/${runId}`);
      const payload = res.data;
      if (payload?.success && payload?.data) {
        setDetail(payload.data);
      } else if (payload?.id) {
        setDetail(payload);
      }
    } catch (err) {
      console.error("Failed to fetch run detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };



  /* ── Sort label ─────────────────────────────────────────── */

  const sortLabel = useMemo(() => {
    switch (sortMode) {
      case "newest": return t("profile.play_history_tab.sort_newest");
      case "oldest": return t("profile.play_history_tab.sort_oldest");
      case "fastest": return t("profile.play_history_tab.sort_fastest");
    }
  }, [sortMode, t]);

  /* ── Render: Loading ────────────────────────────────────── */

  if (loading && runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p>{t("profile.play_history_tab.loading")}</p>
      </div>
    );
  }

  /* ── Render: Error ──────────────────────────────────────── */

  if (error && runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button variant="outline" onClick={() => fetchRuns()}>
          {t("profile.play_history_tab.retry")}
        </Button>
      </div>
    );
  }

  /* ── Render: Main ───────────────────────────────────────── */

  return (
    <div className="space-y-0">
      {/* Card container */}
      <div className="rounded-2xl border border-border dark:border-white/10 bg-card/30 dark:bg-[#0d0d1a]/60 overflow-hidden">
        {/* Sort bar */}
        <div className="flex justify-end gap-3 p-4 border-b border-border dark:border-white/10">
          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id="play-history-sort"
                variant="outline"
                className="gap-2 border-border dark:border-white/10 text-sm shrink-0"
              >
                {sortLabel}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => { setSortMode("newest"); setPage(1); }}
                className={sortMode === "newest" ? "text-amber-500 font-semibold" : ""}
              >
                {t("profile.play_history_tab.sort_newest")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setSortMode("oldest"); setPage(1); }}
                className={sortMode === "oldest" ? "text-amber-500 font-semibold" : ""}
              >
                {t("profile.play_history_tab.sort_oldest")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setSortMode("fastest"); setPage(1); }}
                className={sortMode === "fastest" ? "text-amber-500 font-semibold" : ""}
              >
                {t("profile.play_history_tab.sort_fastest")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Table header */}
        <div
          className="hidden md:grid gap-4 px-6 py-3 text-[11px] uppercase tracking-[0.15em] text-muted-foreground dark:text-gray-500 font-semibold border-b border-border dark:border-white/10"
          style={{ gridTemplateColumns: "minmax(150px, 1.5fr) minmax(140px, 1.5fr) 80px 80px 110px 90px 130px" }}
        >
          <div>{t("profile.play_history_tab.col_run_id")}</div>
          <div>{t("profile.play_history_tab.col_lobby")}</div>
          <div>{t("profile.play_history_tab.col_players")}</div>
          <div>{t("profile.play_history_tab.col_levels")}</div>
          <div>{t("profile.play_history_tab.col_status")}</div>
          <div>{t("profile.play_history_tab.col_time")}</div>
          <div />
        </div>

        {/* Rows */}
        {runs.length > 0 ? (
          <div className="divide-y divide-border dark:divide-white/5">
            {runs.map((run) => {
              const runId = generateRunId(run.id, run.startedAt);
              const isHost = run.players?.some((p) => p.isHost);

              return (
                <div
                  key={run.id}
                  className="group px-6 py-4 transition-colors hover:bg-card/50 dark:hover:bg-white/[0.02] md:grid md:items-center md:gap-4 flex flex-col gap-3"
                  style={{ gridTemplateColumns: "minmax(150px, 1.5fr) minmax(140px, 1.5fr) 80px 80px 110px 90px 130px" }}
                >
                  {/* Run ID + date */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-foreground dark:text-white">
                        {runId}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground dark:text-gray-500">
                      {formatRunDate(run.startedAt)}
                    </span>
                  </div>

                  {/* Lobby */}
                  <div>
                    <div className="font-semibold text-sm text-foreground dark:text-white h-[40px] overflow-hidden break-all whitespace-normal">
                      {run.lobbyName || "—"}
                    </div>
                    {run.lobbyCode && (
                      <span className="text-xs text-muted-foreground dark:text-gray-500 font-mono">
                        {run.lobbyCode}
                      </span>
                    )}
                  </div>

                  {/* Players */}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground dark:text-gray-400">
                    <Users className="h-3.5 w-3.5 text-orange-400" />
                    {run.players?.length || 0}
                  </div>

                  {/* Levels */}
                  <div className="text-sm text-muted-foreground dark:text-gray-400">
                    {run.totalLevels} levels
                  </div>

                  {/* Status */}
                  <div>
                    <Badge
                      variant="outline"
                      className={`text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-md font-semibold ${
                        run.isCompleted
                          ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                          : "border-amber-500/40 text-amber-400 bg-amber-500/10"
                      }`}
                    >
                      {run.isCompleted
                        ? t("profile.play_history_tab.status_completed")
                        : t("profile.play_history_tab.status_incomplete")}
                    </Badge>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground dark:text-gray-500" />
                    <span className={run.totalTimeSec ? "text-foreground dark:text-white font-medium" : "text-muted-foreground dark:text-gray-500"}>
                      {formatTime(run.totalTimeSec)}
                    </span>
                  </div>

                  {/* View Details */}
                  <div className="flex justify-end">
                    <Button
                      id={`play-history-detail-${run.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => openDetail(run.id)}
                      className="gap-1.5 text-xs border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-amber-500 hover:text-amber-400 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                      {t("profile.play_history_tab.view_details")}
                      <span className="text-[10px]">›</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-muted dark:bg-white/5 flex items-center justify-center mb-3">
              <Gamepad2 className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-1">
              {t("profile.play_history_tab.no_runs")}
            </h3>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="text-xs"
          >
            ‹
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <Button
                key={pageNum}
                variant={pageNum === page ? "default" : "ghost"}
                size="sm"
                className={`w-8 h-8 p-0 text-xs ${pageNum === page ? "bg-amber-500 text-black hover:bg-amber-600" : ""}`}
                onClick={() => setPage(pageNum)}
                disabled={loading}
              >
                {pageNum}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="text-xs"
          >
            ›
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      <PlayHistoryDetailModal
        detail={detail}
        open={selectedRunId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRunId(null);
            setDetail(null);
          }
        }}
        loading={detailLoading}
      />
    </div>
  );
}
