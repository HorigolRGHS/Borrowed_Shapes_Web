"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pin, Eye, Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";

function stripHtml(html: string) {
  if (!html) return "";
  // Simple regex to strip HTML tags
  return html.replace(/<[^>]*>/g, "");
}

export function ForumCard({ item }: { item: any }) {
  const initials = item.author?.displayName
    ? item.author?.displayName.substring(0, 2).toUpperCase()
    : "US";

  const { t } = useI18n();
  const hasImage = item.imgUrl?.trim();

  console.log("item: ", item)
  return (
    <Link href={`/forums/${encodeURIComponent(item.slug)}`}>
      <div className={`
        group flex items-start gap-4 p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all duration-300
        bg-white dark:bg-[#0b0b17] border-slate-200 dark:border-[#1e1e3a] hover:border-violet-500 dark:hover:border-violet-500
        shadow-sm hover:shadow-md ${item.isPinned ? "border-violet-500/30 dark:border-violet-500/20" : ""}
      `}>
        {/* Left Side: Avatar */}
        <div className="flex-shrink-0">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-500 text-white font-bold text-sm shadow-md overflow-hidden">
            {item.author?.imgUrl ? (
              <img src={item.author?.imgUrl} alt={item.author?.displayName} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </span>
        </div>

        {/* Main Content Container (Sử dụng flex hoặc grid để chia tỉ lệ) */}
        <div className="flex-1 min-w-0 flex flex-col md:flex-row gap-4">

          {/* Phần nội dung (chiếm 4 phần) */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {item.isPinned && (
                <span className="flex items-center gap-0.5 text-xs text-violet-600 dark:text-violet-400 font-semibold">
                  <Pin className="h-3 w-3 fill-violet-600 dark:fill-violet-400 rotate-45" />
                  {t("forums.pinned") || "PINNED"}
                </span>
              )}
              {item.postType && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-semibold uppercase">
                  {t(`forums.post_type.${item.postType.toLowerCase()}`) || item.postType.replace(/_/g, " ")}
                </span>
              )}
            </div>

            <h3 className="text-slate-800 dark:text-gray-200 group-hover:text-violet-600 font-bold mb-1.5 line-clamp-1 text-base">
              {item.title}
            </h3>

            <div
              className="text-slate-500 dark:text-slate-400 text-sm mb-3 line-clamp-2 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: item.excerpt }}
            />

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
              <span className="text-slate-800 dark:text-slate-200">{item.author?.displayName ?? "Unknown"}</span>
              <span className={`font-bold ${(item.score ?? 0) > 0 ? "text-green-500" : (item.score ?? 0) < 0 ? "text-red-500" : "text-slate-500"}`}>
                {t("forums.score")}: {item.score ?? 0}
              </span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(item.createdAt).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{item.viewCount ?? 0}</span>
            </div>
          </div>

          {/* Phần ảnh (chiếm 1 phần, chỉ hiện khi có ảnh) */}
          {hasImage && (
            <div className="flex-shrink-0 w-full md:w-24 h-24 md:h-auto flex items-center justify-center">
              <div className="w-full h-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                <img
                  src={item.imgUrl}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}