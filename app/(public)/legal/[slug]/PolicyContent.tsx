"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
interface PolicyContentProps {
  policy: any;
}

export default function PolicyContent({ policy }: PolicyContentProps) {
  const { t } = useI18n();

  return (
    <div className="w-full">
      <div className="mb-12">
        <div className="mb-4">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">
            {policy.phase}
          </Badge>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          {policy.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("legal.common.lastUpdated") || "Last Updated"}: <span className="font-medium text-foreground">2026</span>
        </p>
      </div>

      <div className="space-y-6">
        {policy?.sections?.map((section: any, idx: number) => (
          <section key={idx} className="bg-card/30 rounded-2xl p-6 border border-border/50 hover:border-border transition-colors">
            <h2 className="text-xl font-semibold text-foreground mt-0 mb-4">{section.title}</h2>
            <div className="prose dark:prose-invert prose-sm sm:prose-base max-w-none text-muted-foreground">
              <ReactMarkdown>{section.content}</ReactMarkdown>
            </div>
          </section>
        ))}
      </div>
      
      <div className="mt-16 pt-8 border-t border-border flex justify-end items-center">
        <Link href="/contact" className="text-amber-500 hover:underline">
          {t("legal.common.contactPage") || "Contact Support"}
        </Link>
      </div>
    </div>
  );
}
