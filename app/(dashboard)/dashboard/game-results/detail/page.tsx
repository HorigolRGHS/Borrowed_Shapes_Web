"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile } from "@/lib/api/api-client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Zap,
  Users,
  Globe,
  Clock,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const BADGE_BASE_CLASS =
  "rounded-[12px] uppercase tracking-[0.18em] text-[11px]";
const HEADER_CLASS =
  "text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium";

// ── Types ────────────────────────────────────────────────

interface GameResultPlayer {
  gameProfileId: string;
  displayName: string;
  avatarUrl?: string;
  isHost: boolean;
  joinedAt: string;
}

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

interface GameResultDetail {
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

interface PlayerInfo {
  gameProfileId: string;
  displayName: string;
  avatarUrl?: string;
}

interface PlayerStats {
  totalSessions: number;
  totalWins: number;
  totalLosses: number;
  totalAbandoned: number;
  totalPlayTimeSec: number;
}

interface PlayerHistoryRun {
  id: string;
  lobbyName?: string;
  playerRole: "HOST" | "PLAYER";
  totalTimeSec?: number;
  startedAt: string;
}

interface PlayerHistoryData {
  playerInfo: PlayerInfo;
  playerStats: PlayerStats;
  items: PlayerHistoryRun[];
}

// ── Helpers ──────────────────────────────────────────────

function formatTime(totalSec?: number): string {
  if (!totalSec) return "—";
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}m ${seconds}s`;
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  });
}

function formatTimeOnly(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString(undefined, {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  });
}

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

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Component ────────────────────────────────────────────

export default function GameResultDetailPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const runId = searchParams.get("id");

  const [user, setUser] = useState<any>(null);
  const [detail, setDetail] = useState<GameResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Player history modal
  const [selectedPlayer, setSelectedPlayer] =
    useState<GameResultPlayer | null>(null);
  const [playerHistory, setPlayerHistory] =
    useState<PlayerHistoryData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const profile = getUserProfile();
    if (!profile || (profile as any).role !== "ADMIN") {
      router.push("/");
    } else {
      setUser(profile);
    }
  }, [router]);

  useEffect(() => {
    if (user && runId) {
      fetchDetail();
    }
  }, [user, runId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/game-results/detail/${runId}`);
      if (response.data?.success) {
        setDetail(response.data.data);
      } else {
        toast.error(t("gameResults.not_found"));
        router.push("/dashboard/game-results");
      }
    } catch (error) {
      console.error("Failed to fetch game result detail:", error);
      toast.error(t("gameResults.not_found"));
      router.push("/dashboard/game-results");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    try {
      const response = await axios.delete(
        `/api/game-results/delete/${detail.id}`
      );
      if (response.data?.success) {
        toast.success(t("gameResults.delete_success"));
        router.push("/dashboard/game-results");
      } else {
        const message =
          response.data?.message || t("gameResults.delete_failed");
        toast.error(t(message) || message);
      }
    } catch (error: any) {
      console.error("Failed to delete game result:", error);
      const message =
        error.response?.data?.message || t("gameResults.delete_failed");
      toast.error(t(message) || message);
    }
    setShowDeleteDialog(false);
  };

  const handlePlayerClick = async (player: GameResultPlayer) => {
    setSelectedPlayer(player);
    setPlayerHistory(null);
    setLoadingHistory(true);
    try {
      const response = await axios.get(
        `/api/game-results/user/${player.gameProfileId}`
      );
      if (response.data?.success) {
        setPlayerHistory(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch player history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const closePlayerModal = () => {
    setSelectedPlayer(null);
    setPlayerHistory(null);
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <main className="px-8 py-8">
          <div className="rounded-[12px] border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">
            {t("gameResults.loading")}
          </div>
        </main>
      </div>
    );
  }

  if (!detail) return null;

  const sortedSessions = [...detail.sessions].sort(
    (a, b) => a.levelOrder - b.levelOrder
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="px-8 py-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <button
              id="btn-back-to-runs"
              onClick={() => router.push("/dashboard/game-results")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-3xl font-bold text-white">
                {t("gameResults.detail_title")}
              </h2>
              <p className="text-sm text-slate-400">
                {t("gameResults.detail_subtitle")}{" "}
                <span className="text-amber-400 font-mono font-semibold">
                  {detail.id.length > 12
                    ? detail.id.slice(0, 12)
                    : detail.id}
                </span>
              </p>
            </div>
          </div>
          <div className="ml-14 mt-1 h-0.5 w-12 rounded-[12px] bg-amber-500" />
        </div>

        {/* ── Run Information ─────────────────────────── */}
        <section
          id="section-run-info"
          className="rounded-[16px] border border-slate-800 bg-slate-900/60 p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Zap className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">
              {t("gameResults.section_run_info")}
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <InfoBox
              label={t("gameResults.label_lobby_name")}
              value={detail.lobbyName || "—"}
            />
            <InfoBox
              label={t("gameResults.label_lobby_code")}
              value={detail.lobbyCode || "—"}
              mono
            />
            <InfoBox
              label={t("gameResults.label_status")}
              badge={
                <Badge
                  variant="outline"
                  className={`${BADGE_BASE_CLASS} ${
                    detail.isCompleted
                      ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-300"
                      : "border-amber-500/70 bg-amber-500/10 text-amber-300"
                  }`}
                >
                  {detail.isCompleted
                    ? t("gameResults.status_completed")
                    : t("gameResults.status_in_progress")}
                </Badge>
              }
            />
            <InfoBox
              label={t("gameResults.label_visibility")}
              badge={
                <Badge
                  variant="outline"
                  className={`${BADGE_BASE_CLASS} ${
                    detail.isPrivate
                      ? "border-slate-500/70 bg-slate-500/10 text-slate-300"
                      : "border-sky-500/70 bg-sky-500/10 text-sky-300"
                  }`}
                >
                  {detail.isPrivate
                    ? t("gameResults.type_private")
                    : t("gameResults.type_public")}
                </Badge>
              }
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoBox
              label={t("gameResults.label_total_levels")}
              value={String(detail.totalLevels)}
            />
            <InfoBox
              label={t("gameResults.label_total_time")}
              value={formatTime(detail.totalTimeSec)}
              highlight
            />
            <InfoBox
              label={t("gameResults.label_started_at")}
              value={formatDateTime(detail.startedAt)}
            />
            <InfoBox
              label={t("gameResults.label_completed_at")}
              value={formatDateTime(detail.completedAt)}
            />
          </div>
        </section>

        {/* ── Player List ─────────────────────────────── */}
        <section
          id="section-player-list"
          className="rounded-[16px] border border-slate-800 bg-slate-900/60 p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Users className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">
              {t("gameResults.section_player_list")}
            </h3>
          </div>

          <div className="rounded-[12px] border border-slate-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className={HEADER_CLASS}>
                    {t("gameResults.col_player")}
                  </TableHead>
                  <TableHead className={HEADER_CLASS}>
                    {t("gameResults.col_player_id")}
                  </TableHead>
                  <TableHead className={HEADER_CLASS}>
                    {t("gameResults.col_role")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.players.map((player) => {
                  const initials = player.displayName
                    .charAt(0)
                    .toUpperCase();
                  const avatarBg = getAvatarColor(player.displayName);
                  return (
                    <TableRow
                      key={player.gameProfileId}
                      className="border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors"
                      onClick={() => handlePlayerClick(player)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarBg}`}
                          >
                            {initials}
                          </div>
                          <span className="font-medium text-white">
                            {player.displayName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 font-mono text-sm">
                        {player.gameProfileId}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${BADGE_BASE_CLASS} ${
                            player.isHost
                              ? "border-amber-500/70 bg-amber-500/10 text-amber-300"
                              : "border-slate-500/70 bg-slate-500/10 text-slate-300"
                          }`}
                        >
                          {player.isHost
                            ? t("gameResults.role_host")
                            : t("gameResults.role_player")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* ── Session List ────────────────────────────── */}
        <section
          id="section-session-list"
          className="rounded-[16px] border border-slate-800 bg-slate-900/60 p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Globe className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">
              {t("gameResults.section_session_list")}
            </h3>
          </div>

          <div className="rounded-[12px] border border-slate-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className={HEADER_CLASS}>
                    {t("gameResults.col_level")}
                  </TableHead>
                  <TableHead className={HEADER_CLASS}>
                    {t("gameResults.col_session_status")}
                  </TableHead>
                  <TableHead className={HEADER_CLASS}>
                    {t("gameResults.col_result")}
                  </TableHead>
                  <TableHead className={HEADER_CLASS}>
                    {t("gameResults.col_time")}
                  </TableHead>
                  <TableHead className={HEADER_CLASS}>
                    {t("gameResults.col_timeframe")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSessions.length > 0 ? (
                  sortedSessions.map((session) => (
                    <TableRow
                      key={session.id}
                      className="border-slate-800 hover:bg-slate-800/50"
                    >
                      <TableCell className="font-medium text-white">
                        {session.levelName}
                      </TableCell>
                      <TableCell>
                        <SessionStatusBadge status={session.status} />
                      </TableCell>
                      <TableCell>
                        <SessionResultBadge result={session.result} />
                      </TableCell>
                      <TableCell>
                        <span className="text-amber-400 font-bold font-mono">
                          {session.completionTimeSec
                            ? `${session.completionTimeSec}s`
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-sm text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-500" />
                            {t("gameResults.start")}:{" "}
                            {formatTimeOnly(session.startedAt)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-500" />
                            {t("gameResults.end")}:{" "}
                            {formatTimeOnly(session.endedAt)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-12 text-slate-400"
                    >
                      {t("gameResults.no_runs")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* ── Delete Button ───────────────────────────── */}
        <div className="flex justify-end mb-8">
          <Button
            id="btn-delete-game-result"
            variant="destructive"
            size="lg"
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-8"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("gameResults.delete_game_result")}
          </Button>
        </div>

        {/* ── Delete Confirmation Dialog ──────────────── */}
        <AlertDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("gameResults.delete_title")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("gameResults.delete_confirm")}
                <br />
                <span className="text-xs text-slate-500 mt-1 block">
                  {t("gameResults.delete_confirm_undone")}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t("gameResults.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {t("gameResults.action_delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Player History Modal ────────────────────── */}
        <Dialog
          open={selectedPlayer !== null}
          onOpenChange={(open) => {
            if (!open) closePlayerModal();
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] p-0 border-slate-700 bg-slate-900 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
            <DialogTitle className="sr-only">
              {selectedPlayer?.displayName ?? ""}
            </DialogTitle>

            {selectedPlayer && (
              <ScrollArea className="max-h-[85vh]">
                <div className="p-6">
                  {/* Player header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-2xl font-bold text-white ${getAvatarColor(
                        selectedPlayer.displayName
                      )}`}
                    >
                      {selectedPlayer.displayName
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {selectedPlayer.displayName}
                      </h3>
                      <p className="text-sm text-slate-400 font-mono">
                        # {t("gameResults.player_profile_id")}:{" "}
                        {selectedPlayer.gameProfileId}
                      </p>
                    </div>
                  </div>

                  {loadingHistory ? (
                    <div className="rounded-[12px] border border-slate-800 bg-slate-950/60 p-12 text-center text-slate-400">
                      {t("gameResults.loading")}
                    </div>
                  ) : playerHistory ? (
                    <>
                      {/* Stats row */}
                      <div className="grid grid-cols-5 gap-3 mb-6">
                        <StatBox
                          label={t("gameResults.stat_total_sessions")}
                          value={String(
                            playerHistory.playerStats.totalSessions
                          )}
                        />
                        <StatBox
                          label={t("gameResults.stat_total_wins")}
                          value={String(
                            playerHistory.playerStats.totalWins
                          )}
                          color="text-emerald-400"
                        />
                        <StatBox
                          label={t("gameResults.stat_total_losses")}
                          value={String(
                            playerHistory.playerStats.totalLosses
                          )}
                          color="text-rose-400"
                        />
                        <StatBox
                          label={t("gameResults.stat_abandoned")}
                          value={String(
                            playerHistory.playerStats.totalAbandoned
                          )}
                        />
                        <StatBox
                          label={t("gameResults.stat_total_play_time")}
                          value={formatTime(
                            playerHistory.playerStats.totalPlayTimeSec
                          )}
                          color="text-amber-400"
                        />
                      </div>

                      {/* Run history table */}
                      <div className="rounded-[12px] border border-slate-800 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-transparent">
                              <TableHead className={HEADER_CLASS}>
                                {t("gameResults.history_col_run_id")}
                              </TableHead>
                              <TableHead className={HEADER_CLASS}>
                                {t(
                                  "gameResults.history_col_lobby_name"
                                )}
                              </TableHead>
                              <TableHead className={HEADER_CLASS}>
                                {t("gameResults.history_col_role")}
                              </TableHead>
                              <TableHead className={HEADER_CLASS}>
                                {t(
                                  "gameResults.history_col_total_time"
                                )}
                              </TableHead>
                              <TableHead className={HEADER_CLASS}>
                                {t(
                                  "gameResults.history_col_played_date"
                                )}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {playerHistory.items.length > 0 ? (
                              playerHistory.items.map((run) => (
                                <TableRow
                                  key={run.id}
                                  className="border-slate-800 hover:bg-slate-800/50"
                                >
                                  <TableCell className="text-slate-400 font-mono text-sm">
                                    {run.id.length > 12
                                      ? run.id.slice(0, 12)
                                      : run.id}
                                  </TableCell>
                                  <TableCell className="font-medium text-white">
                                    {run.lobbyName || "—"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={`${BADGE_BASE_CLASS} ${
                                        run.playerRole === "HOST"
                                          ? "border-amber-500/70 bg-amber-500/10 text-amber-300"
                                          : "border-slate-500/70 bg-slate-500/10 text-slate-300"
                                      }`}
                                    >
                                      {run.playerRole === "HOST"
                                        ? t("gameResults.role_host")
                                        : t(
                                            "gameResults.role_player"
                                          )}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-amber-400 font-bold font-mono">
                                      {formatTime(run.totalTimeSec)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-slate-400 text-sm">
                                    {formatDateTime(run.startedAt)}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  className="text-center py-8 text-slate-400"
                                >
                                  {t("gameResults.no_runs")}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-[12px] border border-slate-800 bg-slate-950/60 p-12 text-center text-slate-400">
                      {t("gameResults.no_runs")}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────

function InfoBox({
  label,
  value,
  badge,
  mono,
  highlight,
}: {
  label: string;
  value?: string;
  badge?: React.ReactNode;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-[12px] border border-slate-700/60 bg-slate-950/40 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1.5">
        {label}
      </div>
      {badge ? (
        <div className="mt-1">{badge}</div>
      ) : (
        <div
          className={`text-sm font-semibold ${
            highlight ? "text-amber-400" : "text-white"
          } ${mono ? "font-mono" : ""}`}
        >
          {value}
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-[12px] border border-slate-700/60 bg-slate-950/40 px-3 py-3 text-center">
      <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 mb-1">
        {label}
      </div>
      <div
        className={`text-lg font-bold ${color || "text-white"}`}
      >
        {value}
      </div>
    </div>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const isFinished =
    status === "FINISHED" || status === "COMPLETED";
  return (
    <Badge
      variant="outline"
      className={`${BADGE_BASE_CLASS} ${
        isFinished
          ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-300"
          : "border-amber-500/70 bg-amber-500/10 text-amber-300"
      }`}
    >
      {status}
    </Badge>
  );
}

function SessionResultBadge({
  result,
}: {
  result?: string;
}) {
  if (!result) return <span className="text-slate-500">—</span>;
  const isWin = result === "WIN";
  return (
    <Badge
      variant="outline"
      className={`${BADGE_BASE_CLASS} ${
        isWin
          ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-300"
          : "border-rose-500/70 bg-rose-500/10 text-rose-300"
      }`}
    >
      {result}
    </Badge>
  );
}
