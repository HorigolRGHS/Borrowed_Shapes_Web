"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile } from "@/lib/api/api-client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageDropdown } from "@/components/language-dropdown";
import { UserMenu } from "@/components/user-menu";

interface UserProfile {
  displayName?: string;
  role?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const profile = getUserProfile() as UserProfile | null;
    if (!profile || profile.role !== "ADMIN") {
      router.push("/");
      return;
    }
    setUser(profile);
    setMounted(true);
  }, [router]);

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex">
        <div className="hidden md:block w-64 border-r bg-card p-6">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1">
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  const navItems = [
    { href: "/dashboard", label: t("common.dashboard") },
    { href: "/dashboard/wiki", label: t("header.wiki") },
    { href: "/dashboard/forums", label: t("forums.title") || "Forums" },
    { href: "/dashboard/categories", label: t("forums.dashboard.categories") || "Categories" },
    { href: "/dashboard/achievements", label: t("common.achievements") },
    { href: "/dashboard/announcements", label: t("common.announcements") },
    { href: "/dashboard/downloads", label: t("admin.download.nav_label") || "Download" },
    { href: "/dashboard/game-results", label: t("common.game_results") },
  ];

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  const NavList = (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => (
        <Button
          key={item.href}
          asChild
          variant={isActive(item.href) ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => setMobileOpen(false)}
        >
          <Link href={item.href}>{item.label}</Link>
        </Button>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-muted/40">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-card p-4">
        <h2 className="text-xl font-bold px-2 mb-6">Admin Panel</h2>
        {NavList}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card border-b flex items-center justify-between px-4 md:px-8 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open navigation"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4">
                <SheetTitle className="text-xl font-bold mb-6">
                  Admin Panel
                </SheetTitle>
                {NavList}
              </SheetContent>
            </Sheet>
            <h1 className={cn("text-lg font-semibold truncate")}>
              {t("common.dashboard")}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <LanguageDropdown />
            <ThemeToggle />
            <UserMenu displayName={user.displayName ?? ""} role={user.role} />
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
