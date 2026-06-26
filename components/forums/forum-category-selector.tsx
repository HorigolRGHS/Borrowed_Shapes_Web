"use client";

import { useState } from "react";

interface Category {
  id: string;
  name: string;
  description?: string;
  threadCount?: number;
  iconUrl?: string;
}

interface Props {
  categories: Category[];
  onSelect: (id: string) => void;
}



export default function ForumCategorySelector({
  categories,
  onSelect,
}: Props) {

  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
      {categories.map((cat) => (
        <div
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className="
          bg-white dark:bg-[#0b0b17] border border-slate-200 dark:border-violet-900/40 rounded-3xl p-6 cursor-pointer
          shadow-md hover:shadow-xl dark:shadow-none hover:border-violet-500 dark:hover:border-violet-500 hover:shadow-[0_0_25px_rgba(139,92,246,0.3)] dark:hover:shadow-[0_0_25px_rgba(139,92,246,0.3)]
          transition-all duration-300 group"
        >
          <div className="flex items-center gap-4 mb-4">
            {cat.iconUrl && !brokenImages[cat.id] ? (
              <img
                src={cat.iconUrl}
                alt={cat.name}
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                onError={() =>
                  setBrokenImages((prev) => ({
                    ...prev,
                    [cat.id]: true,
                  }))
                }
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xl font-bold flex-shrink-0 text-slate-800 dark:text-white">
                {cat.name[0]}
              </div>
            )}
            <div>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg transition-colors group-hover:text-violet-500">
                {cat.name}
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {cat.threadCount ?? 0} Threads
              </span>
            </div>
          </div>

          <div
            className="text-slate-750 dark:text-slate-300 text-sm line-clamp-2"
            dangerouslySetInnerHTML={{ __html: cat.description || "" }}
          />
        </div>
      ))}
    </div>
  );
}