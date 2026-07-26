"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";

export function DownloadCTA({ user }: { user: any }) {
  const { t } = useI18n();

  const R2_BASE =
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ||
    "https://pub-4a3e334f734f4b669489b78b2a739715.r2.dev";
  const CTA_BG = `${R2_BASE}/LivingRoom.jpeg`;

  return (
    <section className="pb-12 pt-0 -mt-8 md:-mt-16 relative z-10 bg-background dark:bg-[#0a0a14] w-full transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden border border-border dark:border-violet-500/20 shadow-2xl">
          {/* 1. Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${CTA_BG})` }}
          />

          {/* 2. Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-900/85 to-blue-900/80" />

          {/* 3. Optional warm overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/10" />

          {/* Content layout */}
          <div className="relative px-8 py-12 md:py-16 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
            {/* Left content */}
            <div className="flex flex-col gap-4 max-w-2xl text-center md:text-left">
              <span className="text-xs sm:text-sm font-bold tracking-widest text-amber-400 uppercase">
                {t("home.download_cta.label") || "CO-OP HOUSEHOLD ADVENTURE"}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                {t("home.download_cta.title") || "Ready to Borrow Your Shape?"}
              </h2>
              <p className="text-gray-300 text-lg sm:text-xl leading-relaxed max-w-xl">
                {t("home.download_cta.description") ||
                  "Download Borrowed Shapes for free and team up with 2–5 players to solve household challenges, switch between familiar objects, and unlock the next room together."}
              </p>
              <span className="text-sm text-gray-400 italic">
                {t("home.download_cta.platform_note") ||
                  "Available for Windows PC."}
              </span>
            </div>

            {/* Right buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full md:w-auto">
              <Link
                href="/download"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-[#07070f] font-bold hover:bg-gray-100 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] min-w-[180px] w-full sm:w-auto"
              >
                <Download className="w-5 h-5" />
                {t("home.download_cta.download") || "Download"}
              </Link>

              {!user && (
                <Link
                  href="/auth/register"
                  className="flex items-center justify-center px-8 py-4 rounded-xl border-2 border-white/30 text-white font-bold hover:bg-white/10 transition-all duration-300 min-w-[180px] w-full sm:w-auto"
                >
                  {t("home.download_cta.create_account") || "Create Account"}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
