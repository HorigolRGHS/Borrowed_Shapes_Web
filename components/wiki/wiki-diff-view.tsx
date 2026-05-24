"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { collapseEqualRuns } from "@/lib/wiki/markdown-diff";
import type { WikiDiffChunk } from "@/models/dtos/wiki.dto";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  diff: { en: WikiDiffChunk[]; vi: WikiDiffChunk[] } | null;
  isFirst: boolean;
}

function DiffPane({ chunks }: { chunks: WikiDiffChunk[] }) {
  return (
    <pre className="p-4 text-xs leading-5 font-mono whitespace-pre-wrap overflow-x-auto">
      {chunks.map((c, i) => {
        const cls = cn(
          "block px-2 py-0.5",
          c.type === "add" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          c.type === "remove" &&
            "bg-red-500/10 text-red-700 dark:text-red-400 line-through",
          c.type === "equal" && "text-muted-foreground",
        );
        const prefix = c.type === "add" ? "+ " : c.type === "remove" ? "- " : "  ";
        return (
          <span key={i} className={cls}>
            {prefix}
            {c.value}
          </span>
        );
      })}
    </pre>
  );
}

export function WikiDiffView({ diff, isFirst }: Props) {
  const { t } = useI18n();

  if (isFirst || !diff) {
    return (
      <Card className="bg-muted/40">
        <CardContent className="py-6 text-center text-muted-foreground">
          {t("wiki.no_previous_revision")}
        </CardContent>
      </Card>
    );
  }

  const enChunks = collapseEqualRuns(diff.en, 10);
  const viChunks = collapseEqualRuns(diff.vi, 10);

  return (
    <Tabs defaultValue="en">
      <TabsList>
        <TabsTrigger value="en">{t("wiki.tab_en")}</TabsTrigger>
        <TabsTrigger value="vi">{t("wiki.tab_vi")}</TabsTrigger>
      </TabsList>
      <TabsContent value="en">
        <Card>
          <DiffPane chunks={enChunks} />
        </Card>
      </TabsContent>
      <TabsContent value="vi">
        <Card>
          <DiffPane chunks={viChunks} />
        </Card>
      </TabsContent>
    </Tabs>
  );
}
