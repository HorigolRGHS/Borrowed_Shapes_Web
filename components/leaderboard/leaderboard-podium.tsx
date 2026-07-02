import React from "react";
import { Trophy } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";

export interface LeaderboardPlayer {
  displayName: string;
  avatarUrl?: string;
  badgeImageUrl?: string;
}

export interface LeaderboardEntry {
  rank: number;
  runId: string;
  lobbyName?: string;
  totalPlayers: number;
  totalTimeSec: number;
  completedAt: string | Date;
  players?: LeaderboardPlayer[];
}

interface LeaderboardPodiumProps {
  entries: LeaderboardEntry[];
  onSelectEntry: (entry: LeaderboardEntry) => void;
}

const medals = ["🥇", "🥈", "🥉"];
const rankTextColors = [
  "text-amber-600 dark:text-amber-300",
  "text-slate-700 dark:text-gray-300",
  "text-amber-800 dark:text-amber-600",
];

function formatTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (num: number) => String(num).padStart(2, "0");
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

function PodiumCard({
  entry,
  rank,
  onSelect,
}: {
  entry: LeaderboardEntry | undefined;
  rank: number;
  onSelect: (entry: LeaderboardEntry) => void;
}) {
  const podiumHeight = rank === 1 ? "h-28" : rank === 2 ? "h-20" : "h-14";
  const order = rank === 1 ? "order-2" : rank === 2 ? "order-1" : "order-3";

  if (!entry) {
    return (
      <div className={`flex flex-col items-center opacity-30 ${order}`}>
        <div className="text-3xl mb-2">{medals[rank - 1]}</div>
        <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-800 border-4 border-slate-300 dark:border-slate-700/50 mb-2 flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold">
          ?
        </div>
        <p className="text-slate-500 text-xs font-bold">-</p>
        <div
          className={`w-24 ${podiumHeight} rounded-t-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mt-2`}
        />
      </div>
    );
  }

  const lobbyInitials = entry.lobbyName
    ? entry.lobbyName.slice(0, 2).toUpperCase()
    : "RM";

  return (
    <div
      onClick={() => onSelect(entry)}
      className={`flex flex-col items-center ${order} cursor-pointer group transform hover:-translate-y-1 transition-all duration-300`}
    >
      {/* Medal */}
      <div className="text-3xl mb-2 transform group-hover:scale-110 transition-transform duration-200">
        {medals[rank - 1]}
      </div>
      {/* Avatar */}
      {entry.players && entry.players[0] ? (
        <div className="relative mb-2 shrink-0">
          <AvatarWithFrame
            displayName={entry.players[0].displayName}
            avatarUrl={entry.players[0].avatarUrl}
            badgeImageUrl={undefined}
            size="lg"
            className={`bg-gradient-to-br from-violet-600 to-blue-500 rounded-full border-4 transition-all duration-300 ${
              rank === 1
                ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)] text-lg group-hover:shadow-[0_0_25px_rgba(245,158,11,0.45)]"
                : rank === 2
                ? "border-slate-400 text-base"
                : "border-amber-700 text-base"
            }`}
          />
          {entry.totalPlayers > 1 && (
            <span className="absolute -bottom-1 -right-1 bg-violet-600 text-[10px] px-1 rounded-full border border-background dark:border-[#0f0f1a] font-medium scale-90 text-white z-20">
              +{entry.totalPlayers - 1}
            </span>
          )}
        </div>
      ) : (
        <div
          className={`w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white font-bold border-4 mb-2 relative transition-all duration-300 ${
            rank === 1
              ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)] text-lg group-hover:shadow-[0_0_25px_rgba(245,158,11,0.45)]"
              : rank === 2
              ? "border-slate-400 text-base"
              : "border-amber-700 text-base"
          }`}
        >
          <span>{lobbyInitials}</span>
          {entry.totalPlayers > 1 && (
            <span className="absolute -bottom-1 -right-1 bg-violet-600 text-[10px] px-1 rounded-full border border-background dark:border-[#0f0f1a] font-medium scale-90 text-white">
              +{entry.totalPlayers - 1}
            </span>
          )}
        </div>
      )}
      {/* Name */}
      <p
        className={`text-center mb-0.5 truncate max-w-[120px] font-bold ${rankTextColors[rank - 1]}`}
        style={{ fontSize: rank === 1 ? "15px" : "13px" }}
      >
        {entry.lobbyName || `Lobby #${entry.runId.slice(0, 4)}`}
      </p>
      {/* Time */}
      <p className="text-muted-foreground text-xs font-mono font-medium">
        {formatTime(entry.totalTimeSec)}
      </p>
      {/* Podium base */}
      <div
        className={`w-24 ${podiumHeight} rounded-t-xl flex items-center justify-center mt-2 relative overflow-hidden transition-all duration-300 ${
          rank === 1
            ? "bg-amber-500/10 border border-amber-500/50 dark:bg-gradient-to-t dark:from-amber-500/30 dark:to-amber-400/10 dark:border-amber-500/50 shadow-sm shadow-amber-500/5 dark:shadow-[inset_0_1px_0_rgba(251,191,36,0.2)]"
            : rank === 2
            ? "bg-slate-500/5 border border-slate-500/40 dark:bg-gradient-to-t dark:from-gray-500/20 dark:to-gray-400/5 dark:border-gray-500/40"
            : "bg-amber-700/5 border border-amber-700/40 dark:bg-gradient-to-t dark:from-amber-700/20 dark:to-amber-600/5 dark:border-amber-700/40"
        }`}
      >
        {/* Glow lines inside podium base for premium feel */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
        <span
          className="text-2xl font-black opacity-20 dark:opacity-40 select-none"
          style={{
            color: rank === 1 ? "#d97706" : rank === 2 ? "#6b7280" : "#b45309",
            fontSize: "28px",
          }}
        >
          {rank}
        </span>
      </div>
    </div>
  );
}

export const LeaderboardPodium: React.FC<LeaderboardPodiumProps> = ({
  entries,
  onSelectEntry,
}) => {
  const { t } = useI18n();
  const first = entries.find((e) => e.rank === 1);
  const second = entries.find((e) => e.rank === 2);
  const third = entries.find((e) => e.rank === 3);

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-6">
        <Trophy size={16} className="text-amber-500 dark:text-amber-400 animate-pulse" />
        <span className="text-amber-500 dark:text-amber-400 text-xs font-bold tracking-widest">
          {t("leaderboard.top_3")}
        </span>
        <div className="flex-1 h-px bg-violet-500/10 dark:bg-violet-500/20" />
      </div>
      <div className="flex items-end justify-center gap-2 sm:gap-8 bg-card dark:bg-[#0a0a14]/60 backdrop-blur-md rounded-3xl p-6 border border-border dark:border-violet-500/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <PodiumCard entry={second} rank={2} onSelect={onSelectEntry} />
        <PodiumCard entry={first} rank={1} onSelect={onSelectEntry} />
        <PodiumCard entry={third} rank={3} onSelect={onSelectEntry} />
      </div>
    </div>
  );
};
