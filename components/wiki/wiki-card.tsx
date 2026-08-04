"use client";

import Link from "next/link";
import { CalendarDays, UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { cn } from "@/lib/utils";
import type { WikiListItem } from "@/models/dtos/wiki.dto";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  item: WikiListItem;
  showDraftBadge?: boolean;
  href?: string;
  variant?: "default" | "public";
}

export function WikiCard({ item, showDraftBadge = false, href, variant = "default" }: Props) {
  const { t, locale } = useI18n();
  const defaultSlug = locale === "vi" ? (item.slugVi || item.slug) : (item.slug || item.slugVi);
  const defaultSummary =
    locale === "vi"
      ? item.latestRevision?.summaryVi
      : item.latestRevision?.summary;
  const publicSlug = item.slug;
  const publicSummary = item.latestRevision?.summary;
  const linkHref = href ?? `/wiki/${encodeURIComponent(variant === "public" ? publicSlug : defaultSlug)}`;

  if (variant === "default") {
    return (
      <Link href={linkHref} className="block group h-full">
        <Card className="h-full flex flex-col justify-between transition hover:border-primary/40 hover:shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <h3 
              className="text-lg font-semibold line-clamp-2 group-hover:text-primary flex-1 min-w-0 break-words break-all"
              title={item.title}
            >
              {item.title}
            </h3>
            {showDraftBadge && !item.isPublished && (
              <Badge variant="secondary" className="shrink-0">
                {t("wiki.draft_badge")}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            {defaultSummary && (
              <p className="text-sm text-muted-foreground line-clamp-3">{defaultSummary}</p>
            )}
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground mt-auto">
            {item.latestRevision?.author?.displayName && (
              <span>{item.latestRevision.author.displayName} · </span>
            )}
            <span>{new Date(item.updatedAt).toLocaleDateString(locale)}</span>
          </CardFooter>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={linkHref} className="block h-full group">
      <Card
        className={cn(
          "h-full flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-sm transition duration-200 dark:border-[#252541] dark:bg-[#11111d] dark:text-slate-100 dark:shadow-none",
          "hover:border-amber-500/80 hover:shadow-[0_0_30px_rgba(245,158,11,0.16)]",
        )}
      >
        <CardHeader className="flex min-h-[58px] flex-row items-start justify-between gap-2 border-b border-border px-5 py-4 dark:border-[#252541]">
          <h3 
            className="font-serif text-lg font-bold leading-snug text-foreground line-clamp-2 group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-400 flex-1 min-w-0 break-words break-all"
            title={item.title}
          >
            {item.title}
          </h3>
          {showDraftBadge && !item.isPublished && (
            <Badge variant="secondary" className="shrink-0">
              {t("wiki.draft_badge")}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="flex-1 min-h-[96px] border-b border-border px-5 py-5 dark:border-[#252541]">
          {publicSummary && (
            <p className="text-sm leading-6 text-muted-foreground line-clamp-3 dark:text-sky-200/80">{publicSummary}</p>
          )}
        </CardContent>
        <CardFooter className="flex items-center gap-4 px-5 py-4 text-xs text-muted-foreground dark:text-slate-500 mt-auto">
          {item.latestRevision?.author?.displayName && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 shrink-0" />
              <span 
                className="truncate max-w-[120px]"
                title={item.latestRevision.author.displayName}
              >
                {item.latestRevision.author.displayName}
              </span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date(item.updatedAt).toLocaleDateString(locale)}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
