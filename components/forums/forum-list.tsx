"use client";

import { ForumCard } from "./forum-card";
import { useI18n } from "@/lib/i18/i18n-context";

export function ForumList({ items }: { items: any[] }) {
  const { t } = useI18n();

  if (!items || items.length === 0) {
    return <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">{t("forums.empty_list") || "No discussions found!"}</div>;
  }

  return (
    <div className="grid gap-4">
      {items.map((item, index) => (
        <ForumCard key={item.id || `forum-${index}`} item={item} />
      ))}
    </div>
  );
}