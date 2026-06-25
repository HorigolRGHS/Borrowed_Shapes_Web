"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { WikiCategory } from "@/models/dtos/wiki-metadata.dto";
import type { WikiListResponse } from "@/models/dtos/wiki.dto";
import { cn } from "@/lib/utils";
import { categoryLabelKey } from "@/lib/wiki/category-label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WikiCard } from "./wiki-card";
import { WikiList } from "./wiki-list";
import { WikiPagination } from "./wiki-pagination";
import { useI18n } from "@/lib/i18/i18n-context";

type WikiPublicListComponent = ((props: Props) => React.ReactElement) & {
  Skeleton: typeof WikiList.Skeleton;
};

interface Props {
  data?: WikiListResponse;
  basePath: string;
  extraParams?: Record<string, string>;
  emptyMessageKey?: string;
  query?: string;
  errorMessage?: string | null;
}

type FilterValue = "All" | WikiCategory;

function getCategories(data: WikiListResponse): WikiCategory[] {
  const seen = new Set<string>();
  const categories: WikiCategory[] = [];

  for (const item of data.items) {
    const category = item.metadataJson?.category;
    if (!category || seen.has(category)) continue;
    seen.add(category);
    categories.push(category);
  }

  return categories;
}

export const WikiPublicList: WikiPublicListComponent = ({
  data,
  basePath,
  extraParams,
  emptyMessageKey = "wiki.empty_list",
  query,
  errorMessage,
}: Props) => {
  const { t } = useI18n();
  const categories = useMemo(() => (data ? getCategories(data) : []), [data]);
  const [active, setActive] = useState<FilterValue>("All");

  if (active !== "All" && !categories.includes(active)) {
    setActive("All");
  }

  const effectiveActive = active === "All" || categories.includes(active) ? active : "All";

  const visibleItems = useMemo(() => {
    if (!data) return [];
    if (effectiveActive === "All") return data.items;
    return data.items.filter((item) => item.metadataJson?.category === effectiveActive);
  }, [effectiveActive, data]);

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
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          name="q"
          type="search"
          defaultValue={query ?? ""}
          placeholder={t("wiki.public_search_placeholder")}
          className="h-10 rounded-xl border-[#272742] bg-[#11111d] pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500/70"
        />
      </form>

      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{t("wiki.load_failed")}</AlertDescription>
        </Alert>
      )}

      {data && (
        <div className="space-y-7">
          {data.items.length === 0 ? (
            <WikiList.Empty messageKey={emptyMessageKey} />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {(["All", ...categories] as FilterValue[]).map((category) => {
                  const selected = effectiveActive === category;
                  const label =
                    category === "All"
                      ? t("wiki.filter_all")
                      : t(categoryLabelKey(category));
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActive(category)}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm font-medium transition",
                        selected
                          ? "border-amber-500 bg-amber-500/10 text-amber-400 shadow-[0_0_22px_rgba(245,158,11,0.24)]"
                          : "border-[#272742] bg-[#141421] text-sky-200/90 hover:border-amber-500/60 hover:text-amber-300",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {visibleItems.length === 0 ? (
                <WikiList.Empty messageKey={emptyMessageKey} />
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {visibleItems.map((item) => (
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
            </>
          )}
        </div>
      )}
    </>
  );
};

WikiPublicList.Skeleton = WikiList.Skeleton;

export function WikiPublicListSkeleton() {
  return <WikiList.Skeleton />;
}
