"use client";

import type React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  WIKI_CATEGORIES,
  type WikiCategory,
} from "@/models/dtos/wiki-metadata.dto";
import type { WikiPublicListResponse } from "@/models/dtos/wiki.dto";
import { cn } from "@/lib/utils";
import { categoryLabelKey } from "@/lib/wiki/category-label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WikiCard } from "./wiki-card";
import { WikiList } from "./wiki-list";
import { WikiPagination } from "./wiki-pagination";
import { buildWikiPaginationHref } from "./wiki-pagination-url";
import { useI18n } from "@/lib/i18/i18n-context";

type WikiPublicListComponent = ((props: Props) => React.ReactElement) & {
  Skeleton: typeof WikiList.Skeleton;
};

interface Props {
  data?: WikiPublicListResponse;
  basePath: string;
  extraParams?: Record<string, string>;
  emptyMessageKey?: string;
  query?: string;
  category?: WikiCategory;
  errorMessage?: string | null;
}

const FILTER_OPTIONS: readonly ("All" | WikiCategory)[] = [
  "All",
  ...WIKI_CATEGORIES,
];

export const WikiPublicList: WikiPublicListComponent = ({
  data,
  basePath,
  extraParams,
  emptyMessageKey = "wiki.empty_list",
  query,
  category: activeCategory,
  errorMessage,
}: Props) => {
  const { t } = useI18n();

  return (
    <>
      <header className="mb-7 text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-amber-500">
          {t("wiki.hero_kicker")}
        </p>
        <h1 className="text-5xl font-extrabold tracking-tight text-amber-500 md:text-6xl">
          {t("wiki.list_title")}
        </h1>
      </header>

      <form action={basePath} className="relative mx-auto mb-7 max-w-[460px]">
        {activeCategory ? (
          <input type="hidden" name="category" value={activeCategory} />
        ) : null}
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          name="q"
          type="search"
          defaultValue={query ?? ""}
          placeholder={t("wiki.public_search_placeholder")}
          className="h-10 rounded-xl border-border bg-card pl-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-amber-500/70 dark:border-[#272742] dark:bg-[#11111d] dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </form>

      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{t("wiki.load_failed")}</AlertDescription>
        </Alert>
      )}

      {data && (
        <div className="space-y-7">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {FILTER_OPTIONS.map((filterCategory) => {
              const selected =
                filterCategory === "All"
                  ? activeCategory === undefined
                  : activeCategory === filterCategory;
              const label =
                filterCategory === "All"
                  ? t("wiki.filter_all")
                  : t(categoryLabelKey(filterCategory));
              const categoryParams = { ...(extraParams ?? {}) };

              if (filterCategory === "All") {
                delete categoryParams.category;
              } else {
                categoryParams.category = filterCategory;
              }

              return (
                <Link
                  key={filterCategory}
                  href={buildWikiPaginationHref(basePath, 1, categoryParams)}
                  aria-current={selected ? "page" : undefined}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition",
                    selected
                      ? "border-amber-500 bg-amber-500/10 text-amber-400 shadow-[0_0_22px_rgba(245,158,11,0.24)]"
                      : "border-border bg-card text-muted-foreground hover:border-amber-500/60 hover:text-amber-600 dark:border-[#272742] dark:bg-[#141421] dark:text-sky-200/90 dark:hover:text-amber-300",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {data.items.length === 0 ? (
            <WikiList.Empty messageKey={emptyMessageKey} />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {data.items.map((item) => (
                <WikiCard key={item.id} item={item} variant="public" />
              ))}
            </div>
          )}

          <WikiPagination
            page={data.page}
            totalPages={data.totalPages}
            basePath={basePath}
            extraParams={extraParams}
          />
        </div>
      )}
    </>
  );
};

WikiPublicList.Skeleton = WikiList.Skeleton;

export function WikiPublicListSkeleton() {
  return <WikiList.Skeleton />;
}
