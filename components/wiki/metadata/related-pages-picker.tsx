"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAdminWikiList } from "@/lib/wiki/api";
import { useI18n } from "@/lib/i18/i18n-context";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  excludeSlug?: string;
  maxItems?: number;
  locale: "en" | "vi";
}

interface Result {
  slug: string;
  title: string;
}

export function RelatedPagesPicker({
  value,
  onChange,
  excludeSlug,
  maxItems = 30,
  locale,
}: Props) {
  const { t } = useI18n();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Result[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [titlesBySlug, setTitlesBySlug] = React.useState<Map<string, string>>(
    new Map(),
  );
  const [open, setOpen] = React.useState(false);
  const atMax = value.length >= maxItems;

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const resp = await fetchAdminWikiList({
          q: query.trim(),
          limit: 10,
        });
        if (cancelled) return;
        const items: Result[] = resp.items
          .map((it) => ({
            slug: locale === "vi" ? (it.slugVi || it.slug) : (it.slug || it.slugVi),
            title: locale === "vi" ? (it.titleVi || it.title) : (it.title || it.titleVi),
          }))
          .filter((r) => r.slug !== excludeSlug && !value.includes(r.slug));
        setResults(items);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, locale, excludeSlug, value]);

  const add = (r: Result) => {
    if (atMax) return;
    setTitlesBySlug((prev) => {
      const m = new Map(prev);
      m.set(r.slug, r.title);
      return m;
    });
    onChange([...value, r.slug]);
    setQuery("");
    setOpen(false);
  };

  const remove = (slug: string) => {
    onChange(value.filter((s) => s !== slug));
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((slug) => (
            <Badge key={slug} variant="secondary" className="gap-1">
              <span>{titlesBySlug.get(slug) ?? slug}</span>
              <button
                type="button"
                onClick={() => remove(slug)}
                aria-label={`Remove ${slug}`}
                className="rounded-sm hover:bg-muted-foreground/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!open) setOpen(true);
              }}
              placeholder={t("wiki.metadata.related_search")}
              disabled={atMax}
              className="pl-8"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {loading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {t("wiki.metadata.related_no_match")}
            </p>
          ) : (
            <ul className="max-h-64 overflow-auto py-1">
              {results.map((r) => (
                <li key={r.slug}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => add(r)}
                    className="w-full justify-start font-normal"
                  >
                    <span className="truncate">{r.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground truncate">
                      {r.slug}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>
      {atMax && (
        <p className="text-xs text-muted-foreground">
          {t("wiki.metadata.related_max")}
        </p>
      )}
    </div>
  );
}
