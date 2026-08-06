"use client";

import { useState, useEffect } from "react";
import { Users, Star, Trophy, ChevronDown, Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { api, getUserProfile } from "@/lib/api/api-client";
import { LeaderboardPodium, LeaderboardEntry } from "@/components/leaderboard/leaderboard-podium";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { LeaderboardRunModal } from "@/components/leaderboard/leaderboard-run-modal";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";

function formatSeasonMonth(seasonMonth: string, locale: string): string {
  const [year, month] = seasonMonth.split('-');
  const monthNum = parseInt(month, 10);
  if (locale === 'vi') {
    return `Tháng ${monthNum}/${year}`;
  }
  const date = new Date(parseInt(year, 10), monthNum - 1, 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export default function LeaderboardPage() {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<"all-time" | "seasonal">("all-time");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [top3Entries, setTop3Entries] = useState<LeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);
  
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedSeason, setSelectedSeason] = useState<string>(currentMonthStr);
  const [availableSeasons, setAvailableSeasons] = useState<{ seasonMonth: string; label: string }[]>([]);

  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getUserProfile());
    setMounted(true);
    
    // Fetch available seasons
    const fetchSeasons = async () => {
      try {
        const res = await api.get("/game-results/leaderboard/seasons");
        const data = res?.data || res || [];
        if (Array.isArray(data) && data.length > 0) {
          setAvailableSeasons(data);
          setSelectedSeason(data[0].seasonMonth);
        }
      } catch (err) {
        console.error("Failed to fetch available seasons:", err);
      }
    };
    fetchSeasons();
  }, []);

  const fetchLeaderboard = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const paramsObj: Record<string, string> = {
        scope: activeTab,
        page: String(page),
        limit: String(limit),
      };

      if (activeTab === "seasonal" && selectedSeason) {
        paramsObj.seasonMonth = selectedSeason;
      }

      const queryParams = new URLSearchParams(paramsObj);

      const res = await api.get(`/game-results/leaderboard?${queryParams.toString()}`);
      
      // Handle response format from backend/proxy
      const data = res?.data || res || {};
      const items = data.items || [];
      setEntries(items);
      // Keep top3 in sync only when fetching page 1 so the podium
      // stays visible when the user navigates to subsequent pages.
      if (page === 1) {
        setTop3Entries(items.filter((e: LeaderboardEntry) => e.rank <= 3));
      }
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
      setEntries([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Fetch leaderboard data when tab, page or season changes
  useEffect(() => {
    if (!mounted) return;
    fetchLeaderboard(true);
  }, [activeTab, page, limit, selectedSeason, mounted]);

  // Polling every 10 seconds in the background
  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(() => {
      fetchLeaderboard(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [activeTab, page, limit, selectedSeason, mounted]);

  const handleTabChange = (tab: "all-time" | "seasonal") => {
    setActiveTab(tab);
    setPage(1); // Reset to page 1 on tab switch
    setTop3Entries([]); // Clear podium so it re-fetches for the new tab
  };

  // Find if logged-in user has a run in the current list
  const userRankEntry = user
    ? entries.find((e) =>
        e.players?.some((p) => p.displayName === user.displayName)
      )
    : null;

  if (!mounted) {
    return <div className="min-h-screen bg-background dark:bg-[#07070f]" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground dark:bg-[#07070f] dark:text-white">
      {/* Hero Banner */}
      <section className="relative pt-24 pb-8 overflow-hidden">
        {/* Glow behind title */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-violet-600/5 dark:bg-violet-600/10 blur-[80px] pointer-events-none" />
        
        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <span
            className="text-amber-600 dark:text-amber-400 text-xs font-bold tracking-widest uppercase mb-2 block"
          >
            {t("leaderboard.hero_subtitle")}
          </span>
          <h1
            className="text-foreground dark:text-white tracking-tight font-extrabold"
            style={{
              fontSize: "clamp(28px, 6vw, 48px)",
            }}
          >
            <span className="text-amber-600 dark:text-amber-400">{t("leaderboard.hero_title_highlight")}</span>
            {t("leaderboard.hero_title_rest")}
          </h1>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        
        {/* Tabs & Live indicator */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleTabChange("all-time")}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                activeTab === "all-time"
                  ? "bg-amber-500/10 dark:bg-gradient-to-r dark:from-amber-500/20 dark:to-amber-400/10 border-amber-500/40 text-amber-700 dark:text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                  : "bg-transparent border-border dark:border-[#1e1e3a] text-muted-foreground hover:text-foreground dark:text-gray-500 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600"
              }`}
            >
              {t("leaderboard.tab_all_time")}
            </button>
            <button
              onClick={() => handleTabChange("seasonal")}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                activeTab === "seasonal"
                  ? "bg-amber-500/10 dark:bg-gradient-to-r dark:from-amber-500/20 dark:to-amber-400/10 border-amber-500/40 text-amber-700 dark:text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                  : "bg-transparent border-border dark:border-[#1e1e3a] text-muted-foreground hover:text-foreground dark:text-gray-500 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600"
              }`}
            >
              {t("leaderboard.tab_seasonal")}
            </button>

            {/* Previous season selector dropdown */}
            {activeTab === "seasonal" && (
              <div className="relative inline-flex items-center">
                <div className="absolute left-3 pointer-events-none text-amber-600 dark:text-amber-400 flex items-center">
                  <Calendar size={15} />
                </div>
                <select
                  value={selectedSeason}
                  onChange={(e) => {
                    setSelectedSeason(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 pr-9 py-2.5 rounded-xl text-sm font-bold bg-card dark:bg-[#121225] border border-amber-500/30 text-amber-700 dark:text-amber-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer appearance-none"
                >
                  {(availableSeasons.length > 0
                    ? availableSeasons
                    : [{ seasonMonth: currentMonthStr }]
                  ).map((s) => (
                    <option
                      key={s.seasonMonth}
                      value={s.seasonMonth}
                      className="bg-background text-foreground dark:bg-[#0f0f1a] dark:text-white"
                    >
                      {formatSeasonMonth(s.seasonMonth, locale)} {s.seasonMonth === currentMonthStr ? `(${t("leaderboard.current_season") || "Hiện tại"})` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-amber-600 dark:text-amber-400 absolute right-3 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Stats Banner */}
        <div className="mb-10">
          <div className="relative bg-card dark:bg-[#0f0f1a] border border-border dark:border-violet-500/10 rounded-2xl p-6 overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm dark:shadow-none">
            <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-violet-600/5 blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-violet-500/5 dark:bg-violet-500/10 border border-border dark:border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                <Users size={20} />
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase tracking-widest">
                  {t("leaderboard.stats_total_runs")}
                </p>
                <p className="text-foreground dark:text-white text-2xl font-black">
                  {isLoading ? "..." : total}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Podium (Top 3 Cards) — always uses top3Entries so it stays
            visible when the user navigates to pages beyond page 1. */}
        {top3Entries.length > 0 && (
          <LeaderboardPodium entries={top3Entries} onSelectEntry={setSelectedEntry} />
        )}

        {/* Full Rankings Table */}
        <LeaderboardTable
          entries={entries}
          isLoading={isLoading}
          onSelectEntry={setSelectedEntry}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />

        {/* Personal ranking sticky block */}
        {user && !isLoading && (
          <div className="mt-8 bg-card dark:bg-[#0f0f1a]/95 backdrop-blur-md border border-border dark:border-violet-500/20 rounded-2xl p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AvatarWithFrame
                  displayName={user.displayName}
                  avatarUrl={user.imgUrl}
                  badgeImageUrl={user.equippedAchievement?.badgeImageUrl || user.equippedAchievementId?.badgeImageUrl}
                  size="md"
                  className="border border-border dark:border-violet-500/20 rounded-full"
                />
                <div>
                  <p className="text-foreground dark:text-white text-sm font-bold">
                    {user.displayName}
                  </p>
                  <p className="text-muted-foreground text-xs font-sans">
                    {t("leaderboard.your_ranking")}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-6 self-stretch sm:self-auto justify-between">
                <div>
                  <p className="text-foreground dark:text-white text-sm font-bold font-mono text-right sm:text-left">
                    {userRankEntry ? `#${userRankEntry.rank}` : "—"}
                  </p>
                  <p className="text-muted-foreground text-xs font-sans">
                    {t("leaderboard.global_rank")}
                  </p>
                </div>
                
                {userRankEntry ? (
                  <span className="text-green-600 dark:text-green-400 text-xs font-bold flex items-center gap-1 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg">
                    {t("leaderboard.ranked")}
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                    {t("leaderboard.unranked")}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal Pop-up */}
      <LeaderboardRunModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  );
}
