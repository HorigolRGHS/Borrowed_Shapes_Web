"use client";

import { useState, useEffect } from "react";
import { Users, Star, Trophy } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { api, getUserProfile } from "@/lib/api/api-client";
import { LeaderboardPodium, LeaderboardEntry } from "@/components/leaderboard/leaderboard-podium";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { LeaderboardRunModal } from "@/components/leaderboard/leaderboard-run-modal";

export default function LeaderboardPage() {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<"all-time" | "seasonal">("all-time");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);
  
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getUserProfile());
    setMounted(true);
  }, []);

  const fetchLeaderboard = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        scope: activeTab,
        page: String(page),
        limit: String(limit),
      });

      const res = await api.get(`/game-results/leaderboard?${queryParams.toString()}`);
      
      // Handle response format from backend/proxy
      const data = res?.data || res || {};
      const items = data.items || [];
      setEntries(items);
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

  // Fetch leaderboard data when tab or page changes
  useEffect(() => {
    if (!mounted) return;
    fetchLeaderboard(true);
  }, [activeTab, page, limit, mounted]);

  // Polling every 10 seconds in the background
  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(() => {
      fetchLeaderboard(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [activeTab, page, limit, mounted]);

  const handleTabChange = (tab: "all-time" | "seasonal") => {
    setActiveTab(tab);
    setPage(1); // Reset to page 1 on tab switch
  };

  const getSeasonalMonthLabel = () => {
    return new Date().toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
      month: "long",
      year: "numeric",
    });
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
            className="text-amber-600 dark:text-amber-400 text-xs font-bold tracking-widest uppercase mb-2 block font-orbitron"
          >
            {t("leaderboard.hero_subtitle")}
          </span>
          <h1
            className="text-foreground dark:text-white tracking-tight font-extrabold"
            style={{
              fontFamily: "var(--font-orbitron), sans-serif",
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTabChange("all-time")}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold font-rajdhani border transition-all cursor-pointer ${
                activeTab === "all-time"
                  ? "bg-amber-500/10 dark:bg-gradient-to-r dark:from-amber-500/20 dark:to-amber-400/10 border-amber-500/40 text-amber-700 dark:text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                  : "bg-transparent border-border dark:border-[#1e1e3a] text-muted-foreground hover:text-foreground dark:text-gray-500 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600"
              }`}
            >
              {t("leaderboard.tab_all_time")}
            </button>
            <button
              onClick={() => handleTabChange("seasonal")}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold font-rajdhani border transition-all cursor-pointer ${
                activeTab === "seasonal"
                  ? "bg-amber-500/10 dark:bg-gradient-to-r dark:from-amber-500/20 dark:to-amber-400/10 border-amber-500/40 text-amber-700 dark:text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                  : "bg-transparent border-border dark:border-[#1e1e3a] text-muted-foreground hover:text-foreground dark:text-gray-500 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600"
              }`}
            >
              {t("leaderboard.tab_seasonal")} ({getSeasonalMonthLabel()})
            </button>
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
                <p className="text-muted-foreground text-[10px] font-orbitron uppercase tracking-widest">
                  {t("leaderboard.stats_total_runs")}
                </p>
                <p className="text-foreground dark:text-white text-2xl font-black font-orbitron">
                  {isLoading ? "..." : total}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Podium (Top 3 Cards) */}
        {!isLoading && entries.length > 0 && (
          <LeaderboardPodium entries={entries} onSelectEntry={setSelectedEntry} />
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0 border border-border dark:border-violet-500/20">
                  {user.imgUrl ? (
                    <img src={user.imgUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    user.displayName?.[0]?.toUpperCase() || "U"
                  )}
                </div>
                <div>
                  <p className="text-foreground dark:text-white text-sm font-bold font-rajdhani">
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
                  <span className="text-green-600 dark:text-green-400 text-xs font-bold font-rajdhani flex items-center gap-1 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg">
                    {t("leaderboard.ranked")}
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 text-xs font-bold font-rajdhani flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
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
