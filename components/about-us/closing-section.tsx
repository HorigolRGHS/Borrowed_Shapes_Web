"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import Link from "next/link";
import { Download, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AboutUsClosing() {
  const { t } = useI18n();

  return (
    <section className="relative py-16 bg-background border-t border-border/50">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
          {t("about_us.closing.title") || "Nhiều đôi tay cùng tạo nên một hình hài."}
        </h2>

        <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
          {t("about_us.closing.description") ||
            "Borrowed Shapes không chỉ là một dự án game, mà còn là hành trình cả đội cùng lên kế hoạch, thiết kế, xây dựng, kiểm thử và hoàn thiện."}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="lg" className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-semibold gap-2">
            <Link href="/">
              <Compass className="w-4 h-4" />
              {t("about_us.closing.primary_cta") || "Khám phá trò chơi"}
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto font-semibold gap-2 border-border">
            <Link href="/download">
              <Download className="w-4 h-4 text-amber-500" />
              {t("about_us.closing.secondary_cta") || "Tải game"}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
