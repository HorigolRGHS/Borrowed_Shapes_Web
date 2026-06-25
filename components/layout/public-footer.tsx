"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18/i18n-context";

export function PublicFooter() {
  const { t } = useI18n();

  return (
    <footer className="bg-background dark:bg-[#07070f] border-t border-border dark:border-[#1e1e3a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Left block: Brand */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2 group w-fit">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
                <span className="font-bold text-white text-lg">B</span>
              </div>
              <span className="font-black text-lg tracking-wider text-foreground dark:text-white">
                BORROWED SHAPES
              </span>
            </Link>
            <p className="text-sm text-muted-foreground dark:text-gray-400 max-w-sm">
              {t("footer.description")}
            </p>
          </div>

          {/* Center block: Navigation Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground dark:text-white tracking-wider text-sm uppercase">
              {t("footer.nav_title")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-sm text-muted-foreground dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-500 transition-colors">
                  {t("footer.home")}
                </Link>
              </li>
              <li>
                <Link href="/wiki" className="text-sm text-muted-foreground dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-500 transition-colors">
                  {t("footer.wiki")}
                </Link>
              </li>
              <li>
                <Link href="/forums" className="text-sm text-muted-foreground dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-500 transition-colors">
                  {t("footer.forum")}
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-sm text-muted-foreground dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-500 transition-colors">
                  {t("footer.leaderboard")}
                </Link>
              </li>
              <li>
                <Link href="/download" className="text-sm text-muted-foreground dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-500 transition-colors">
                  {t("footer.download")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Right block: Legal / Support Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground dark:text-white tracking-wider text-sm uppercase">
              {t("footer.support_title")}
            </h3>
            <ul className="space-y-3">
              <li>
                {/* TODO: add route later */}
                <Link href="#" className="text-sm text-muted-foreground dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-500 transition-colors">
                  {t("footer.about")}
                </Link>
              </li>
              <li>
                {/* TODO: add route later */}
                <Link href="#" className="text-sm text-muted-foreground dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-500 transition-colors">
                  {t("footer.contact")}
                </Link>
              </li>
              <li>
                {/* TODO: add route later */}
                <Link href="#" className="text-sm text-muted-foreground dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-500 transition-colors">
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                {/* TODO: add route later */}
                <Link href="#" className="text-sm text-muted-foreground dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-500 transition-colors">
                  {t("footer.terms")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground dark:text-gray-500">
            {t("footer.copyright")}
          </p>
          <p className="text-xs text-muted-foreground dark:text-gray-500 font-medium">
            {t("footer.tagline")}
          </p>
        </div>
      </div>
    </footer>
  );
}
