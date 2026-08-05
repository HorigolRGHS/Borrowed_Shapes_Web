"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { collapseEqualRuns } from "@/lib/wiki/markdown-diff";
import type { WikiDiffChunk } from "@/models/dtos/wiki.dto";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { WikiContentRenderer } from "@/components/wiki/wiki-content-renderer";
import { cn } from "@/lib/utils";

interface Props {
  diff: { en: WikiDiffChunk[]; vi: WikiDiffChunk[] } | null;
  isFirst: boolean;
}

function DiffPane({ chunks }: { chunks: WikiDiffChunk[] }) {
  return (
    <div className="divide-y">
      {chunks.map((c, i) => {
        if (c.type === "equal" && c.value.startsWith("... ")) {
          return (
            <div key={i} className="px-4 py-2 text-xs text-muted-foreground italic">
              {c.value.trim()}
            </div>
          );
        }
        const cls = cn(
          "border-l-4 px-4 py-2",
          c.type === "add" && "border-emerald-500 bg-emerald-500/5",
          c.type === "remove" && "border-red-500 bg-red-500/5 opacity-75",
          c.type === "equal" && "border-transparent",
        );
        return (
          <div key={i} className={cls}>
            <WikiContentRenderer markdown={c.value} />
          </div>
        );
      })}
    </div>
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
