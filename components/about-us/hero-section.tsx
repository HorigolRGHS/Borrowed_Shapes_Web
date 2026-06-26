"use client";

import { useI18n } from "@/lib/i18/i18n-context";

export function AboutUsHero() {
  const { t } = useI18n();

  const R2_BASE = process.env.NEXT_PUBLIC_R2_URL || "https://pub-4a3e334f734f4b669489b78b2a739715.r2.dev";
  const HERO_BG = `${R2_BASE}/Flop.png`;

  return (
    <section className="relative w-full h-[70vh] min-h-[500px] max-h-[800px] bg-background dark:bg-[#07070f] overflow-hidden mt-16">
      {/* Background Image: No heavy blur, keep it crisp and center-focused */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-100 hover:scale-105"
        style={{ backgroundImage: `url(${HERO_BG})` }}
      />

      {/* Subtle Bottom Fade to blend into the next section */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background dark:from-[#07070f] to-transparent pointer-events-none" />
      
      {/* Subtle Side Vignette to frame the subject without obscuring it */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-background/50 dark:to-[#07070f]/70 pointer-events-none" />

      {/* Decorative Glows at the edges */}
      <div className="absolute -left-32 -top-32 w-96 h-96 bg-amber-500/20 dark:bg-amber-500/30 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute -right-32 top-1/2 w-96 h-96 bg-orange-500/10 dark:bg-orange-500/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: "2s" }} />

      {/* Minimalistic Text/Label at the bottom corner */}
      <div className="absolute bottom-8 left-4 md:left-12 z-20">
        <div className="flex items-center gap-3">
          <div className="h-[1px] w-12 bg-amber-500/50" />
          <span className="text-sm font-bold tracking-[0.3em] uppercase text-foreground/80 dark:text-white/80 drop-shadow-md">
            {t("about_us.hero.eyebrow") || "THE TEAM BEHIND THE SHAPES"}
          </span>
        </div>
      </div>
    </section>
  );
}
