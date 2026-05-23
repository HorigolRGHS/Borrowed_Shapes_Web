'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18/i18n-context';
import { extractToc } from '@/lib/wiki/markdown-toc';

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
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );
    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="hidden lg:block w-60 shrink-0 sticky top-24 self-start text-sm">
      <p className="font-semibold text-gray-700 mb-2">{t('wiki.toc_title')}</p>
      <ul className="space-y-1 border-l border-gray-200">
        {items.map((it) => (
          <li key={it.id} style={{ paddingLeft: `${(it.level - 1) * 12}px` }}>
            <a
              href={`#${it.id}`}
              className={`block px-3 py-1 -ml-px border-l-2 transition ${
                it.id === activeId
                  ? 'border-blue-500 text-blue-700 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
