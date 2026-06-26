"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function PrivacyPage() {
  const { t } = useI18n();
  const sections = Array.from({ length: 8 }, (_, i) => i);

  return (
    <main className="max-w-4xl mx-auto px-4 py-16">
      <div className="mb-12">
        <div className="mb-4">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">{t("legal.privacy.badge")}</Badge>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">{t("legal.privacy.title")}</h1>
        <p className="text-sm text-muted-foreground mb-8">
          {t("legal.common.lastUpdated")}: <span className="font-medium text-foreground">{t("legal.privacy.lastUpdatedValue")}</span>
        </p>
        <p className="text-lg text-foreground leading-relaxed">
          {t("legal.privacy.intro")}
        </p>
      </div>

      <div className="space-y-6">
        {sections.map((idx) => {
          const title = t(`legal.privacy.sections.${idx}.title`);
          const body = t(`legal.privacy.sections.${idx}.body`);
          
          if (title === `legal.privacy.sections.${idx}.title` || !title) return null;
          
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
