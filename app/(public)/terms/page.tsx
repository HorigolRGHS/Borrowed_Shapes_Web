"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export default function TermsPage() {
  const { t } = useI18n();
  const sections = Array.from({ length: 10 }, (_, i) => i);

  return (
    <main className="max-w-4xl mx-auto px-4 py-16">
      <div className="mb-12">
        <div className="mb-4">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">{t("legal.terms.badge")}</Badge>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">{t("legal.terms.title")}</h1>
        <p className="text-sm text-muted-foreground mb-8">
          {t("legal.common.lastUpdated")}: <span className="font-medium text-foreground">{t("legal.terms.lastUpdatedValue")}</span>
        </p>
        <p className="text-lg text-foreground leading-relaxed">
          {t("legal.terms.intro")}
        </p>
      </div>

      <div className="space-y-6">
        {/* Rule 0 Easter Egg */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-fuchsia-500/10 to-cyan-500/10 p-6 md:p-8 shadow-lg mb-10">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.25),transparent_30%)]" />
          <div className="relative space-y-4">
            <Badge className="bg-gradient-to-r from-amber-500 to-fuchsia-500 text-white border-0 shadow-sm mb-2">
              <Sparkles className="mr-1 h-3 w-3 inline-block" /> {t("legal.terms.ruleZero.badge")}
            </Badge>
            <h2 className="text-2xl font-bold text-foreground bg-gradient-to-r from-amber-400 to-fuchsia-500 bg-clip-text text-transparent">
              {t("legal.terms.ruleZero.title")}
            </h2>
            <div className="text-foreground leading-relaxed font-medium">
              {t("legal.terms.ruleZero.body")}
            </div>
            <p className="text-sm text-muted-foreground italic border-t border-amber-500/20 pt-4 mt-4">
              {t("legal.terms.ruleZero.note")}
            </p>
          </div>
        </div>

        {sections.map((idx) => {
          const title = t(`legal.terms.sections.${idx}.title`);
          const body = t(`legal.terms.sections.${idx}.body`);
          
          if (title === `legal.terms.sections.${idx}.title` || !title) return null;
          
          return (
            <section key={idx} className="bg-card/30 rounded-2xl p-6 md:p-8 border border-border/50 hover:border-border transition-colors">
              <h2 className="text-xl font-semibold mb-4 text-foreground">{title}</h2>
              <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {body}
              </div>
            </section>
          );
        })}
      </div>
      
      <div className="mt-16 pt-8 border-t border-border flex justify-end items-center">
        <Link href="/contact" className="text-amber-500 hover:underline">{t("legal.common.contactPage")}</Link>
      </div>
    </main>
  );
}
