"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import Link from "next/link";
import { Download, Compass } from "lucide-react";

export function AboutUsClosing() {
  const { t } = useI18n();

  return (
    <section className="relative py-24 bg-background dark:bg-[#07070f] flex flex-col items-center justify-center border-t border-border/50 dark:border-white/5">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-amber-500/10 to-orange-500/5 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-foreground dark:text-white mb-6">
          {t("about_us.closing.title") || "Built by many hands, shaped as one."}
        </h2>
        
        <p className="text-lg md:text-xl text-muted-foreground dark:text-amber-100/70 mb-10 max-w-2xl mx-auto leading-relaxed">
          {t("about_us.closing.description") || "Borrowed Shapes is not only a game project, but also a shared journey of planning, designing, building, testing, and improving together."}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/" 
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all hover:-translate-y-0.5"
          >
            <Compass className="w-5 h-5" />
            {t("about_us.closing.primary_cta") || "Explore the Game"}
          </Link>
          
          <Link 
            href="/download" 
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-card/50 dark:bg-white/5 hover:bg-card dark:hover:bg-white/10 text-foreground dark:text-white border border-border dark:border-white/10 px-8 py-4 rounded-xl font-bold text-lg transition-all backdrop-blur-sm"
          >
            <Download className="w-5 h-5 text-amber-500" />
            {t("about_us.closing.secondary_cta") || "Download the Game"}
          </Link>
        </div>
      </div>
    </section>
  );
}
