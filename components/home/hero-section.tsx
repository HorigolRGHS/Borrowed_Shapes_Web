"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { Download, BookOpen, Users, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { Modak } from "next/font/google";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/api-client";

const modak = Modak({ subsets: ["latin"], weight: "400" });

function formatStat(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function StatCard({ icon: Icon, value, label, colorClass }: { icon: ComponentType<{ className?: string }>; value: string; label: string; colorClass: string }) {
  return (
    <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 transition-transform hover:-translate-y-1 hover:shadow-lg">
      <div className={cn("p-2 rounded-lg bg-white/5", colorClass)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="font-bold text-xl text-white leading-tight">{value}</div>
        <div className="text-xs text-gray-400 font-medium tracking-wider uppercase">{label}</div>
      </div>
    </div>
  );
}

export function HeroSection() {
  const { t } = useI18n();
  const [playersValue, setPlayersValue] = useState("67+");
  const [latestPatch, setLatestPatch] = useState("1.0.0");

  const HERO_BG = process.env.NEXT_PUBLIC_HERO_BG_URL || "https://pub-4a3e334f734f4b669489b78b2a739715.r2.dev/notexthouseright.jpg";

  useEffect(() => {
    const fetchHeroStats = async () => {
      try {
        const activeVersionResponse = await api.get("/downloads/active-version");
        const activeVersionData = activeVersionResponse?.data || activeVersionResponse;
        if (activeVersionData?.fileVersion) {
          setLatestPatch(activeVersionData.fileVersion);
        }
      } catch {
        // Keep the default patch version if the public endpoint is not available.
      }

      try {
        const statsResponse = await api.get("/game-results/public-stats");
        const stats = statsResponse?.data || statsResponse;
        const totalGameSessions = stats?.totalGameSessions;

        if (typeof totalGameSessions === "number") {
          setPlayersValue(formatStat(totalGameSessions));
        }
      } catch {
        // If the admin dashboard statistics endpoint is unavailable, retain the default value.
      }
    };

    fetchHeroStats();
  }, []);

  return (
    <section className="relative w-full h-[80vh] min-h-[600px] flex items-center overflow-hidden bg-[#07070f] mt-16">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 opacity-60"
        style={{ backgroundImage: `url(${HERO_BG})` }}
      />

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#07070f] via-[#07070f]/60 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07070f] via-transparent to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 to-orange-900/20 z-10 mix-blend-overlay" />

      {/* Floating Shapes Background (Right side) */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden pointer-events-none z-20 hidden lg:block">
        <div className="absolute top-[20%] right-[15%] w-64 h-64 border-2 border-amber-500/30 rounded-full animate-float blur-[1px]" />
        <div className="absolute top-[50%] right-[25%] w-48 h-48 border-2 border-orange-500/30 rounded-lg rotate-45 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[15%] right-[10%] w-56 h-56 border-2 border-yellow-500/20 rounded-xl rotate-12 animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Content Container */}
      <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl">

          {/* Title */}
          <h1 className={cn(
            "relative z-40 text-6xl sm:text-7xl lg:text-[96px] leading-[0.9] mb-6 drop-shadow-[0_0_28px_rgba(245,158,11,0.65)]",
            modak.className
          )}>
            <span className="block bg-gradient-to-br from-amber-400 to-orange-500 bg-clip-text text-transparent">
              {t("home.hero.title_line_1") || "Borrowed"}
            </span>
            <span className="block bg-gradient-to-br from-orange-400 to-red-500 bg-clip-text text-transparent ml-4 sm:ml-8">
              {t("home.hero.title_line_2") || "Shapes"}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-amber-100/70 mb-8 max-w-xl leading-relaxed font-medium">
            {t("home.hero.subtitle")}
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
            <Link
              href="/download"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all hover:-translate-y-0.5 animate-pulse-glow"
            >
              <Download className="w-5 h-5" />
              {t("home.hero.play_free_now")}
            </Link>

            <Link
              href="/wiki"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-xl font-bold text-lg transition-all backdrop-blur-sm"
            >
              <BookOpen className="w-5 h-5 text-amber-500" />
              {t("home.hero.explore_wiki")}
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              icon={Users}
              value={playersValue}
              label={t("home.hero.stats.active_players") || "Active Players"}
              colorClass="text-amber-500"
            />
            <StatCard
              icon={Zap}
              value={latestPatch}
              label={t("home.hero.stats.latest_patch") || "Latest Patch"}
              colorClass="text-yellow-500"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
