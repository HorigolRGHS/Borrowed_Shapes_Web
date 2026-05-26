"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageDropdown } from "@/components/language-dropdown";
import { UserMenu } from "@/components/user-menu";
import { WikiSearchBar } from "@/components/wiki/wiki-search-bar";
import { getUserProfile } from "@/lib/api/api-client";
import { useI18n } from "@/lib/i18/i18n-context";

interface UserProfile {
  displayName?: string;
  role?: string;
}

export function WikiPublicHeader() {
  const { t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getUserProfile() as UserProfile | null);
    setMounted(true);
    const handler = (e: any) => setUser(e.detail);
    window.addEventListener("api:profile-updated" as any, handler);
    return () => window.removeEventListener("api:profile-updated" as any, handler);
  }, []);

  // Reflect ?q= in the search input only on the search page; elsewhere start blank.
  const initialQuery =
    pathname === "/wiki/search" ? (searchParams.get("q") ?? "") : "";

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 max-w-6xl h-14 flex items-center gap-3">
        <Link href="/wiki" className="font-semibold text-foreground whitespace-nowrap">
          {t("common.site_brand")}
        </Link>
        <div className="flex-1 max-w-xl">
          {/* key forces remount on route change so initialQuery prop reseeds the input */}
          <WikiSearchBar key={pathname} initialQuery={initialQuery} />
        </div>
        <div className="flex items-center gap-1">
          <LanguageDropdown />
          <ThemeToggle />
          {mounted && user ? (
            <UserMenu displayName={user.displayName ?? ""} role={user.role} />
          ) : (
            mounted && (
              <Button asChild size="sm">
                <Link href="/auth/login">{t("auth.login")}</Link>
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
