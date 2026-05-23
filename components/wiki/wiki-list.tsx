"use client";

import { BookOpen } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import type { WikiListResponse } from "@/models/dtos/wiki.dto";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WikiCard } from "./wiki-card";
import { WikiPagination } from "./wiki-pagination";

interface Props {
  data: WikiListResponse;
  basePath: string;
  extraParams?: Record<string, string>;
  showDraftBadge?: boolean;
  emptyMessageKey?: string;
}

function WikiListEmpty({ messageKey }: { messageKey: string }) {
  const { t } = useI18n();
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <BookOpen className="h-10 w-10 mb-3 opacity-50" />
        <p>{t(messageKey)}</p>
      </CardContent>
    </Card>
  );
}

function WikiListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-3 w-1/3 mt-3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function WikiList({
  data,
  basePath,
  extraParams,
  showDraftBadge = false,
  emptyMessageKey = "wiki.empty_list",
}: Props) {
  if (data.items.length === 0) {
    return <WikiListEmpty messageKey={emptyMessageKey} />;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.items.map((item) => (
          <WikiCard key={item.id} item={item} showDraftBadge={showDraftBadge} />
        ))}
      </div>
      <WikiPagination
        page={data.page}
        totalPages={data.totalPages}
        basePath={basePath}
        extraParams={extraParams}
      />
    </>
  );
}

WikiList.Skeleton = WikiListSkeleton;
WikiList.Empty = WikiListEmpty;
