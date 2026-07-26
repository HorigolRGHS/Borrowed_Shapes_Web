"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function LegalToc({ items, title = "Contents" }: { items: TocItem[], title?: string }) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="text-sm">
      <p className="font-semibold text-foreground mb-4 tracking-wider uppercase text-xs">{title}</p>
      <ul className="space-y-1 border-l border-border">
        {items.map((it) => (
          <li key={it.id} style={{ paddingLeft: `${(it.level - 1) * 12}px` }}>
            <a
              href={`#${it.id}`}
              className={cn(
                "block px-3 py-1.5 -ml-px border-l-2 transition-colors",
                it.id === activeId
                  ? "border-amber-500 text-amber-500 font-medium bg-amber-500/5 rounded-r-md"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card/50",
              )}
            >
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
