"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { Badge } from "@/components/ui/badge";

export function AboutUsHero() {
  const { t } = useI18n();

  return (
    <section className="relative w-full pt-16 pb-8 border-b border-border/50 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="mb-4">
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20 text-xs font-semibold uppercase tracking-wider"
          >
            {t("about_us.hero.eyebrow") || "ĐỘI NGŨ PHÁT TRIỂN"}
          </Badge>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
          {t("about_us.team.title") || "Về Chúng Tôi"}
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed">
          {t("about_us.hero.subtitle") ||
            "Gặp gỡ những người đã cùng lên kế hoạch, xây dựng, kiểm thử, thiết kế và phát triển nền tảng Borrowed Shapes."}
        </p>
      </div>
    </section>
  );
}
