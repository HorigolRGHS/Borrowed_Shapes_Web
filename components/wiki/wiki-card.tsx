"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18/i18n-context";
import type { WikiListItem } from "@/models/dtos/wiki.dto";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  item: WikiListItem;
  showDraftBadge?: boolean;
  href?: string;
}

export function WikiCard({ item, showDraftBadge = false, href }: Props) {
  const { t, locale } = useI18n();
  const title = locale === "vi" ? item.title_vi : item.title;
  const slug = locale === "vi" ? item.slug_vi : item.slug;
  const summary =
    locale === "vi"
      ? item.latestRevision?.summary_vi
      : item.latestRevision?.summary;
  const linkHref = href ?? `/wiki/${encodeURIComponent(slug)}`;

  return (
    <Link href={linkHref} className="block group">
      <Card className="h-full transition hover:border-primary/40 hover:shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-primary">
            {title}
          </h3>
          {showDraftBadge && !item.isPublished && (
            <Badge variant="secondary" className="shrink-0">
              {t("wiki.draft_badge")}
            </Badge>
          )}
        </CardHeader>
        {summary && (
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-3">{summary}</p>
          </CardContent>
        )}
        <CardFooter className="text-xs text-muted-foreground">
          {item.latestRevision?.author?.displayName && (
            <span>{item.latestRevision.author.displayName} · </span>
          )}
          <span>{new Date(item.updatedAt).toLocaleDateString(locale)}</span>
        </CardFooter>
      </Card>
    </Link>
  );
}
