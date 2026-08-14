import React from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { LeaderboardEntry } from "./leaderboard-podium";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  onSelectEntry: (entry: LeaderboardEntry) => void;
  page: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
}

const medals = ["🥇", "🥈", "🥉"];
const rankTextColors = [
  "text-amber-600 dark:text-amber-300",
  "text-slate-700 dark:text-gray-300",
  "text-amber-800 dark:text-amber-600",
];

function formatTime(totalSeconds: number): string {
  if (!totalSeconds) return "—";
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (num: number) => String(num).padStart(2, "0");
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

function formatDate(dateInput: string | Date, locale: string): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  isLoading,
  onSelectEntry,
  page,
  totalPages,
  onPageChange,
}) => {
  const { t, locale } = useI18n();

  if (isLoading) {
    return (
      <div className="bg-card/80 dark:bg-[#0f0f1a]/80 backdrop-blur-md border border-border dark:border-violet-500/10 rounded-2xl p-12 text-center shadow-lg">
        <div className="inline-block w-8 h-8 border-4 border-amber-500 dark:border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground text-lg">
          {t("leaderboard.loading")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card/85 dark:bg-[#0f0f1a]/85 backdrop-blur-md border border-border dark:border-violet-500/10 rounded-2xl overflow-hidden shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      {/* Title Header */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-border dark:border-violet-500/10 bg-muted/20 dark:bg-[#0f0f1a]/40">
        <Star size={14} className="text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400 animate-pulse" />
        <span className="text-foreground dark:text-white text-sm font-bold tracking-wider">
          {t("leaderboard.full_rankings")}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-muted-foreground text-lg">
            {t("leaderboard.no_entries")}
          </p>
        </div>
      ) : (
        <>
          {/* Table Header for medium/large screens */}
          <div
            className="hidden sm:grid grid-cols-12 px-6 py-3 border-b border-border dark:border-violet-500/10 text-xs text-muted-foreground uppercase tracking-widest font-bold bg-muted/10 dark:bg-[#07070f]/30"
          >
            <span className="col-span-1">{t("leaderboard.col_rank")}</span>
            <span className="col-span-4">{t("leaderboard.col_lobby_name")}</span>
            <span className="col-span-3">{t("leaderboard.col_players")}</span>
            <span className="col-span-2">{t("leaderboard.col_time")}</span>
            <span className="col-span-2 text-right">{t("leaderboard.col_date")}</span>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-border dark:divide-violet-500/5">
            {entries.map((entry) => {
              const isTop3 = entry.rank <= 3;
              const idx = entry.rank - 1;

              const displayPlayers = entry.players || [];
              const visiblePlayers = displayPlayers.slice(0, 3);
              const extraPlayers =
                displayPlayers.length > 3 ? displayPlayers.length - 3 : 0;

              return (
                <div
                  key={entry.runId}
                  onClick={() => onSelectEntry(entry)}
                  className={`grid grid-cols-12 px-6 py-4 items-center cursor-pointer hover:bg-muted/30 dark:hover:bg-violet-500/5 transition-all duration-200 group ${
                    entry.rank === 1
                      ? "bg-amber-500/5"
                      : entry.rank === 2
                      ? "bg-slate-500/5"
                      : entry.rank === 3
                      ? "bg-amber-700/5"
                      : ""
                  }`}
                >
                  {/* Rank */}
                  <div className="col-span-2 sm:col-span-1 flex items-center">
                    {isTop3 ? (
                      <span className="text-2xl">{medals[idx]}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm font-bold font-mono">
                        #{entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Team/Lobby Name */}
                  <div className="col-span-6 sm:col-span-4 pr-2">
                    <p
                      className={`text-sm font-bold truncate group-hover:text-primary transition-colors ${
                        isTop3 ? rankTextColors[idx] : "text-foreground/90 dark:text-gray-300"
                      }`}
                    >
                      {entry.lobbyName || `Lobby #${entry.runId.slice(0, 4)}`}
                    </p>
                    <p className="sm:hidden text-[10px] text-muted-foreground mt-0.5">
                      {formatDate(entry.completedAt, locale)}
                    </p>
                  </div>

                  {/* Players Circle Stack */}
                  <div className="col-span-4 sm:col-span-3 flex items-center">
                    {displayPlayers.length > 0 ? (
                      <div className="flex -space-x-2">
                        {visiblePlayers.map((player, pIdx) => (
                          <AvatarWithFrame
                            key={pIdx}
                            displayName={player.displayName}
                            avatarUrl={player.avatarUrl}
                            badgeImageUrl={player.badgeImageUrl}
                            size="xs"
                            className="border-2 border-background dark:border-[#0f0f1a] rounded-full"
                          />
                        ))}
                        {extraPlayers > 0 && (
                          <div className="w-6 h-6 rounded-full bg-muted dark:bg-slate-800 border-2 border-background dark:border-[#0f0f1a] flex items-center justify-center text-muted-foreground dark:text-slate-300 text-[8px] font-bold shrink-0">
                            +{extraPlayers}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">
                        {entry.totalPlayers} {t("leaderboard.col_players")}
                      </span>
                    )}
                  </div>

                  {/* Time */}
                  <div className="col-span-12 sm:col-span-2 mt-2 sm:mt-0">
                    <span
                      className={`text-sm font-bold font-mono ${
                        entry.rank === 1
                          ? "text-amber-600 dark:text-amber-300"
                          : entry.rank === 2
                          ? "text-slate-600 dark:text-gray-300"
                          : entry.rank === 3
                          ? "text-amber-700 dark:text-amber-500"
                          : "text-muted-foreground dark:text-gray-400"
                      }`}
                    >
                      {formatTime(entry.totalTimeSec)}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="hidden sm:block col-span-2 text-right text-muted-foreground text-xs font-mono">
                    {formatDate(entry.completedAt, locale)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && onPageChange && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border dark:border-violet-500/10 bg-muted/5 dark:bg-[#07070f]/20">
              <span className="text-xs text-muted-foreground">
                {t("pagination.page")} {page} {t("pagination.of")} {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                  className="p-1.5 rounded-lg border border-border dark:border-violet-500/20 text-muted-foreground hover:text-foreground dark:hover:text-white hover:border-gray-400 dark:hover:border-violet-500/40 disabled:opacity-30 disabled:hover:text-muted-foreground disabled:hover:border-border dark:disabled:hover:border-violet-500/20 transition-all cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                  className="p-1.5 rounded-lg border border-border dark:border-violet-500/20 text-muted-foreground hover:text-foreground dark:hover:text-white hover:border-gray-400 dark:hover:border-violet-500/40 disabled:opacity-30 disabled:hover:text-muted-foreground disabled:hover:border-border dark:disabled:hover:border-violet-500/20 transition-all cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
