"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18/i18n-context";
import { extractToc } from "@/lib/wiki/markdown-toc";
import { cn } from "@/lib/utils";

interface Props {
  markdown: string;
}

export function WikiToc({ markdown }: Props) {
  const { t } = useI18n();
  const items = useMemo(() => extractToc(markdown), [markdown]);
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

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const topOffset = 100;
      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setActiveId(id);
      window.history.pushState(null, "", `#${id}`);
    }
  };

  if (items.length === 0) return null;

  return (
    <nav className="text-sm">
      <p className="font-semibold text-foreground mb-2">{t("wiki.toc_title")}</p>
      <ul className="space-y-1 border-l border-border">
        {items.map((it) => (
          <li key={it.id} style={{ paddingLeft: `${(it.level - 1) * 12}px` }}>
            <a
              href={`#${it.id}`}
              onClick={(e) => handleClick(e, it.id)}
              className={cn(
                "block px-3 py-1 -ml-px border-l-2 transition cursor-pointer",
                it.id === activeId
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground",
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
