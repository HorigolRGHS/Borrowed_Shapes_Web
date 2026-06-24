"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, ArrowRight } from "lucide-react";
import { fetchWikiList } from "@/lib/wiki/api";
import { WikiCard } from "@/components/wiki/wiki-card";
import { Button } from "@/components/ui/button";
import type { WikiListResponse } from "@/models/dtos/wiki.dto";

export function KnowledgeBaseSection() {
  const [data, setData] = useState<WikiListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWikiList({ page: 1, limit: 6 })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data || data.items.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-background dark:bg-[#0a0a14] w-full transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-10">
          <span className="text-sm font-bold tracking-widest text-amber-500 uppercase">
            WIKI
          </span>
          <h2 className="mt-2 text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground dark:text-white">
            Knowledge Base
          </h2>
          <div className="mt-3 h-1 w-20 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.items.map((item) => (
            <WikiCard key={item.id} item={item} />
          ))}
        </div>

        {/* Browse button */}
        <div className="mt-10 flex justify-center">
          <Button asChild variant="outline" className="group px-6 py-3 text-base">
            <Link href="/wiki">
              <BookOpen className="mr-2 h-4 w-4" />
              Browse Full Wiki
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
