"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile } from "@/lib/api/api-client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { Users, Globe, Clock, ChevronDown, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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

const BADGE_BASE_CLASS = "rounded-[12px] uppercase tracking-[0.18em] text-[11px]";
const ITEMS_PER_PAGE = 10;

type Tab = "runs" | "leaderboard";

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

interface LeaderboardEntry {
  rank: number;
  runId: string;
  lobbyName?: string;
  totalPlayers: number;
  totalTimeSec: number;
  completedAt: string;
}

function formatTime(totalSec?: number): string {
  if (!totalSec) return "—";
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}m ${seconds}s`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}

export default function GameResultsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>("runs");

  // Runs state
  const [runs, setRuns] = useState<GameResult[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsPage, setRunsPage] = useState(1);
  const [runsTotalPages, setRunsTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [deleteRun, setDeleteRun] = useState<GameResult | null>(null);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [leaderboardTotalPages, setLeaderboardTotalPages] = useState(1);

  useEffect(() => {
    const profile = getUserProfile();
    if (!profile || (profile as any).role !== "ADMIN") {
      router.push("/");
    } else {
      setUser(profile);
    }
  }, [router]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === "runs") {
      fetchRuns();
    }
  }, [user, activeTab, runsPage, statusFilter, visibilityFilter]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === "leaderboard") {
      fetchLeaderboard();
    }
  }, [user, activeTab, leaderboardPage]);

  const fetchRuns = async () => {
    try {
      setRunsLoading(true);
      const params: Record<string, any> = {
        page: runsPage,
        limit: ITEMS_PER_PAGE,
      };
      if (statusFilter === "completed") params.isCompleted = "true";
      if (statusFilter === "in_progress") params.isCompleted = "false";
      if (visibilityFilter === "public") params.isPrivate = "false";
      if (visibilityFilter === "private") params.isPrivate = "true";

      const response = await axios.get("/api/game-results/list", { params });

      if (response.data?.success) {
        const payload = response.data.data;
        setRuns(payload.items || []);
        setRunsTotalPages(payload.totalPages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch game results:", error);
    } finally {
      setRunsLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      const response = await axios.get("/api/game-results/leaderboard", {
        params: { page: leaderboardPage, limit: ITEMS_PER_PAGE },
      });

      if (response.data?.success) {
        const payload = response.data.data;
        setLeaderboard(payload.items || []);
        setLeaderboardTotalPages(payload.totalPages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const handleDeleteRun = async (id: string) => {
    try {
      const response = await axios.delete(`/api/game-results/delete/${id}`);
      if (response.data?.success) {
        toast.success(t("gameResults.delete_success"));
      } else {
        const message = response.data?.message || t("gameResults.delete_failed");
        toast.error(t(message) || message);
        return;
      }
      fetchRuns();
      setDeleteRun(null);
    } catch (error: any) {
      console.error("Failed to delete game result:", error);
      const message = error.response?.data?.message || t("gameResults.delete_failed");
      toast.error(t(message) || message);
    }
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setVisibilityFilter("all");
    setRunsPage(1);
  };

  const renderPaginationItems = (currentPage: number, totalPages: number, setPage: (p: number) => void) => {
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
              setPage(page);
            }}
          >
            {page}
          </PaginationLink>
        </PaginationItem>
      );
    });
  };

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return "bg-yellow-500 text-black";
    if (rank === 2) return "bg-slate-300 text-black";
    if (rank === 3) return "bg-amber-700 text-white";
    return "bg-slate-600 text-white";
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-y-auto px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4">
            <div>
              <h2 className="text-4xl font-bold text-white sm:text-2xl">{t("gameResults.management_title")}</h2>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-sm leading-7 text-slate-400">{t("gameResults.management_subtitle")}</p>
                <div className="mt-2 h-0.5 w-12 rounded-[12px] bg-amber-500" />
              </div>

              {/* Tab switcher */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-700 p-1 shrink-0 self-start md:self-auto">
                <button
                  id="tab-runs"
                  onClick={() => { setActiveTab("runs"); setRunsPage(1); }}
                  className={`px-5 py-2 text-xs font-bold uppercase tracking-[0.18em] rounded-md transition-all ${
                    activeTab === "runs"
                      ? "bg-amber-500 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t("gameResults.tab_runs")}
                </button>
                <button
                  id="tab-leaderboard"
                  onClick={() => { setActiveTab("leaderboard"); setLeaderboardPage(1); }}
                  className={`px-5 py-2 text-xs font-bold uppercase tracking-[0.18em] rounded-md transition-all ${
                    activeTab === "leaderboard"
                      ? "bg-amber-500 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t("gameResults.tab_leaderboard")}
                </button>
              </div>
            </div>

            {/* Filters - only for runs tab */}
            {activeTab === "runs" && (
              <div className="flex items-center gap-3 mt-2">
                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setRunsPage(1); }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("gameResults.filter_all_status")}</SelectItem>
                    <SelectItem value="completed">{t("gameResults.filter_completed")}</SelectItem>
                    <SelectItem value="in_progress">{t("gameResults.filter_in_progress")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={visibilityFilter} onValueChange={(val) => { setVisibilityFilter(val); setRunsPage(1); }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("gameResults.filter_all_visibility")}</SelectItem>
                    <SelectItem value="public">{t("gameResults.filter_public")}</SelectItem>
                    <SelectItem value="private">{t("gameResults.filter_private")}</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-xs uppercase tracking-wider"
                >
                  {t("gameResults.filter_clear")}
                </Button>
              </div>
            )}
          </div>

          {/* RUNS TAB */}
          {activeTab === "runs" && (
            <>
              {runsLoading ? (
                <div className="rounded-[12px] border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">
                  {t("gameResults.loading")}
                </div>
              ) : (
                <>
                  <div className="rounded-[12px] border border-slate-800 bg-slate-900/60 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-800 hover:bg-transparent">
                          <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">{t("gameResults.col_run_id")}</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">{t("gameResults.col_lobby")}</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">{t("gameResults.col_details")}</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">{t("gameResults.col_status_type")}</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">{t("gameResults.col_timeline")}</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium text-center">{t("gameResults.col_actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {runs.length > 0 ? (
                          runs.map((run) => (
                            <TableRow key={run.id} className="border-slate-800 hover:bg-slate-800/50">
                              {/* Run ID */}
                              <TableCell className="text-slate-400 font-mono text-sm">
                                {run.id.slice(0, 8)}
                              </TableCell>

                              {/* Lobby */}
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-white">{run.lobbyName || "—"}</span>
                                  {run.lobbyCode && (
                                    <span className="text-xs text-slate-500">Code: {run.lobbyCode}</span>
                                  )}
                                </div>
                              </TableCell>

                              {/* Details */}
                              <TableCell>
                                <div className="flex flex-col gap-1 text-sm">
                                  <span className="flex items-center gap-1.5 text-slate-300">
                                    <Users className="h-3.5 w-3.5 text-orange-400" />
                                    {run.players?.length || 0} {t("gameResults.players")}
                                  </span>
                                  <span className="flex items-center gap-1.5 text-slate-300">
                                    <Globe className="h-3.5 w-3.5 text-emerald-400" />
                                    {run.totalLevels} {t("gameResults.levels")}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    <span className={run.totalTimeSec ? "text-amber-400 font-semibold" : "text-slate-500"}>
                                      {formatTime(run.totalTimeSec)}
                                    </span>
                                  </span>
                                </div>
                              </TableCell>

                              {/* Status / Type */}
                              <TableCell>
                                <div className="flex flex-col items-start gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className={`${BADGE_BASE_CLASS} w-32 justify-center ${
                                      run.isCompleted
                                        ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-300"
                                        : "border-amber-500/70 bg-amber-500/10 text-amber-300"
                                    }`}
                                  >
                                    {run.isCompleted ? t("gameResults.status_completed") : t("gameResults.status_in_progress")}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`${BADGE_BASE_CLASS} w-32 justify-center ${
                                      run.isPrivate
                                        ? "border-slate-500/70 bg-slate-500/10 text-slate-300"
                                        : "border-sky-500/70 bg-sky-500/10 text-sky-300"
                                    }`}
                                  >
                                    {run.isPrivate ? t("gameResults.type_private") : t("gameResults.type_public")}
                                  </Badge>
                                </div>
                              </TableCell>

                              {/* Timeline */}
                              <TableCell>
                                <div className="flex flex-col gap-0.5 text-sm text-slate-400">
                                  <span>{t("gameResults.start")}: {formatDate(run.startedAt)}</span>
                                  <span>{t("gameResults.end")}: {formatDate(run.completedAt)}</span>
                                </div>
                              </TableCell>

                              {/* Actions */}
                              <TableCell className="text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem
                                      onClick={() => router.push(`/dashboard/game-results/detail?id=${run.id}`)}
                                      className="cursor-pointer"
                                    >
                                      {t("gameResults.action_view")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setDeleteRun(run)}
                                      className="cursor-pointer text-rose-400 focus:text-rose-400"
                                    >
                                      {t("gameResults.action_delete")}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                              {t("gameResults.no_runs")}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {runs.length > 0 && (
                    <Pagination className="mt-8">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (runsPage > 1) setRunsPage(runsPage - 1);
                            }}
                            className={runsPage <= 1 ? "pointer-events-none opacity-40" : ""}
                          />
                        </PaginationItem>
                        {renderPaginationItems(runsPage, runsTotalPages, setRunsPage)}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (runsPage < runsTotalPages) setRunsPage(runsPage + 1);
                            }}
                            className={runsPage >= runsTotalPages ? "pointer-events-none opacity-40" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}
            </>
          )}

          {/* LEADERBOARD TAB */}
          {activeTab === "leaderboard" && (
            <>
              <div className="rounded-[12px] border border-slate-800 bg-slate-900/60 overflow-hidden p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-400" />
                    <h3 className="text-lg font-bold uppercase tracking-wider text-white">
                      {t("gameResults.leaderboard_title")}
                    </h3>
                  </div>
                </div>

                {leaderboardLoading ? (
                  <div className="p-12 text-center text-slate-400">
                    {t("gameResults.loading")}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">{t("gameResults.col_rank")}</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">{t("gameResults.col_team_lobby")}</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium text-center">{t("gameResults.col_total_players")}</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">{t("gameResults.col_total_time")}</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium text-right">{t("gameResults.col_completed_date")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.length > 0 ? (
                        leaderboard.map((entry) => (
                          <TableRow key={entry.runId} className="border-slate-800 hover:bg-slate-800/50">
                            {/* Rank */}
                            <TableCell>
                              <div className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${getRankBadgeClass(entry.rank)}`}>
                                {entry.rank}
                              </div>
                            </TableCell>

                            {/* Team / Lobby Name */}
                            <TableCell className="font-medium text-white">
                              {entry.lobbyName || "—"}
                            </TableCell>

                            {/* Total Players */}
                            <TableCell className="text-center text-slate-300">
                              {entry.totalPlayers}
                            </TableCell>

                            {/* Total Time */}
                            <TableCell>
                              <span className="text-amber-400 font-bold font-mono">
                                {formatTime(entry.totalTimeSec)}
                              </span>
                            </TableCell>

                            {/* Completed Date */}
                            <TableCell className="text-right text-slate-400">
                              {formatDate(entry.completedAt)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                            {t("gameResults.no_leaderboard")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>

              {leaderboard.length > 0 && (
                <Pagination className="mt-8">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (leaderboardPage > 1) setLeaderboardPage(leaderboardPage - 1);
                        }}
                        className={leaderboardPage <= 1 ? "pointer-events-none opacity-40" : ""}
                      />
                    </PaginationItem>
                    {renderPaginationItems(leaderboardPage, leaderboardTotalPages, setLeaderboardPage)}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (leaderboardPage < leaderboardTotalPages) setLeaderboardPage(leaderboardPage + 1);
                        }}
                        className={leaderboardPage >= leaderboardTotalPages ? "pointer-events-none opacity-40" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </main>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteRun !== null} onOpenChange={(open) => { if (!open) setDeleteRun(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("gameResults.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("gameResults.delete_confirm")}
              <br />
              <span className="text-xs text-slate-500 mt-1 block">
                {t("gameResults.delete_confirm_undone")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("gameResults.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRun && handleDeleteRun(deleteRun.id)}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {t("gameResults.action_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
