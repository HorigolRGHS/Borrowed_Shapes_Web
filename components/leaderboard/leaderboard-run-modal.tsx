import React from "react";
import { X, Trophy, Clock, Calendar, Users } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { LeaderboardEntry } from "./leaderboard-podium";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";

interface LeaderboardRunModalProps {
  entry: LeaderboardEntry | null;
  onClose: () => void;
}

const medals = ["🥇", "🥈", "🥉"];

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
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return `${mm}/${dd}/${yyyy}, ${time}`;
}

export const LeaderboardRunModal: React.FC<LeaderboardRunModalProps> = ({
  entry,
  onClose,
}) => {
  const { t, locale } = useI18n();

  if (!entry) return null;

  const displayPlayers = entry.players || [];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-card dark:bg-[#0f0f1a] border border-border dark:border-violet-500/30 rounded-2xl p-6 max-w-md w-full mx-4 shadow-lg dark:shadow-[0_0_50px_rgba(139,92,246,0.15)] animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effects */}
        <div className="absolute -top-20 -left-20 w-48 h-48 rounded-full bg-violet-500/5 dark:bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted dark:bg-[#1e1e3a] hover:bg-muted/80 dark:hover:bg-[#2e2e4a] border border-border dark:border-[#2e2e4a] flex items-center justify-center transition-colors group cursor-pointer z-10"
        >
          <X size={16} className="text-muted-foreground group-hover:text-foreground dark:text-gray-400 dark:group-hover:text-white" />
        </button>

        {/* Header */}
        <div className="relative mb-6 flex items-center gap-3">
          <div className="text-3xl shrink-0">
            {entry.rank <= 3 ? medals[entry.rank - 1] : "🏆"}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground dark:text-white font-bold text-lg truncate pr-6">
              {entry.lobbyName || `Lobby #${entry.runId.slice(0, 4)}`}
            </h3>
            <p className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
              {t("leaderboard.modal_rank")} #{entry.rank}
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6 relative">
          <div className="bg-muted/30 dark:bg-[#1e1e3a]/30 border border-border dark:border-[#1e1e3a] rounded-xl p-3 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold mb-1">
              <Clock size={12} className="text-amber-500 dark:text-amber-400" />
              {t("leaderboard.modal_completion_time")}
            </div>
            <p className="text-amber-600 dark:text-amber-400 font-bold font-mono text-base">
              {formatTime(entry.totalTimeSec)}
            </p>
          </div>

          <div className="bg-muted/30 dark:bg-[#1e1e3a]/30 border border-border dark:border-[#1e1e3a] rounded-xl p-3 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold mb-1">
              <Trophy size={12} className="text-violet-500 dark:text-violet-400" />
              {t("leaderboard.global_rank")}
            </div>
            <p className="text-violet-600 dark:text-violet-400 font-bold font-mono text-base">
              #{entry.rank}
            </p>
          </div>
        </div>

        {/* Teammates List */}
        <div className="relative mb-6">
          <h4 className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Users size={12} className="text-blue-500 dark:text-blue-400" />
            {t("leaderboard.modal_players")} ({entry.totalPlayers})
          </h4>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar">
            {displayPlayers.length > 0 ? (
              displayPlayers.map((player, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-muted/20 hover:bg-muted/40 dark:bg-[#1e1e3a]/20 dark:hover:bg-[#1e1e3a]/40 border border-border dark:border-[#1e1e3a]/50 dark:hover:border-violet-500/20 rounded-xl px-3 py-2.5 transition-all"
                >
                  <AvatarWithFrame
                    displayName={player.displayName}
                    avatarUrl={player.avatarUrl}
                    badgeImageUrl={player.badgeImageUrl}
                    size="sm"
                    className="border border-border dark:border-[#1e1e3a] rounded-full"
                  />
                  <span className="text-foreground/90 dark:text-gray-200 font-semibold text-sm truncate">
                    {player.displayName}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 bg-muted/10 rounded-xl border border-border dark:border-[#1e1e3a]/30">
                <span className="text-xs text-muted-foreground">
                  {entry.totalPlayers} anonymous players
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Date Details */}
        <div className="relative pt-4 border-t border-border dark:border-violet-500/10 text-xs text-muted-foreground flex items-center gap-1.5 font-sans">
          <Calendar size={12} className="text-gray-400" />
          <span>{t("leaderboard.modal_completed_date")}: </span>
          <span className="text-foreground/80 dark:text-gray-300 font-mono">
            {formatDate(entry.completedAt, locale)}
          </span>
        </div>
      </div>
    </div>
  );
};
