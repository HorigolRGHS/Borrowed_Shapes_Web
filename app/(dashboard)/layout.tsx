"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Menu,
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  Users,
  MessageSquare,
  Flag,
  Tags,
  Trophy,
  Megaphone,
  Download,
  Gamepad2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile, api } from "@/lib/api/api-client";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageDropdown } from "@/components/language-dropdown";
import { UserMenu } from "@/components/user-menu";

interface UserProfile {
  displayName?: string;
  role?: string;
  imgUrl?: string;
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [imgError, setImgError] = useState(false);
  const logoUrl = "/icon.jpg";

  useEffect(() => {
    const profile = getUserProfile() as UserProfile | null;
    if (!profile || profile.role !== "ADMIN") {
      router.push("/");
      return;
    }
    setUser(profile);
    const storedCollapsed = localStorage.getItem("admin-sidebar-collapsed");
    if (storedCollapsed === "true") {
      setIsCollapsed(true);
    }

    // Check next month achievements from day 25
    const now = new Date();
    if (now.getDate() >= 25) {
      const checkAchievements = async () => {
        const lastReminder = localStorage.getItem("lastAchievementReminder");
        if (lastReminder) {
          const diff = Date.now() - parseInt(lastReminder, 10);
          if (diff < 30 * 60 * 1000) return; // 30 minutes
        }

        try {
          const res = await api.get("/achievements/admin/check-next-month");
          if (res?.success && res?.data?.hasAll === false) {
            toast.warning(
              t("admin.achievements.reminder_toast") ||
                "Hệ thống: Vui lòng tạo đủ 5 Achievement TOP cho tháng sau!",
              {
                autoClose: false,
              },
            );
            localStorage.setItem(
              "lastAchievementReminder",
              Date.now().toString(),
            );
          }
        } catch (err) {
          console.error("Failed to check achievements", err);
        }
      };
      checkAchievements();
    }
    setMounted(true);
  }, [router, t]);

  const toggleSidebar = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    localStorage.setItem("admin-sidebar-collapsed", String(newVal));
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex">
        <div className="hidden md:block w-64 border-r bg-card p-4">
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
    { href: "/dashboard", label: t("common.dashboard"), icon: LayoutDashboard },
    {
      href: "/dashboard/audit-logs",
      label: t("admin.auditLogs.nav") || "Audit Log",
      icon: ClipboardList,
    },
    { href: "/dashboard/wiki", label: t("header.wiki"), icon: BookOpen },
    {
      href: "/dashboard/accounts",
      label: t("admin.account.nav_label") || "Accounts",
      icon: Users,
    },
    {
      href: "/dashboard/forums",
      label: t("forums.title") || "Forums",
      icon: MessageSquare,
    },
    {
      href: "/dashboard/reports",
      label: t("reports.title") || "Reports",
      icon: Flag,
    },
    {
      href: "/dashboard/categories",
      label: t("forums.dashboard.categories") || "Categories",
      icon: Tags,
    },
    {
      href: "/dashboard/achievements",
      label: t("common.achievements"),
      icon: Trophy,
    },
    {
      href: "/dashboard/announcements",
      label: t("common.announcements"),
      icon: Megaphone,
    },
    {
      href: "/dashboard/downloads",
      label: t("admin.download.nav_label") || "Download",
      icon: Download,
    },
    {
      href: "/dashboard/game-results",
      label: t("common.game_results"),
      icon: Gamepad2,
    },
  ];

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  const renderNavItems = (collapsed: boolean) => (
    <TooltipProvider delayDuration={0}>
      <nav className="flex flex-col gap-2 mt-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          const LinkContent = (
            <Link
              href={item.href}
              className="flex items-center w-full h-full overflow-hidden"
            >
              <div className="w-5 flex justify-center shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={cn(
                  "transition-all duration-300 whitespace-nowrap",
                  collapsed ? "opacity-0 w-0 ml-0" : "opacity-100 w-full ml-3",
                )}
              >
                {item.label}
              </span>
            </Link>
          );

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant={active ? "secondary" : "ghost"}
                  className={cn(
                    "h-10 w-full justify-start overflow-hidden transition-all duration-300",
                    active
                      ? "bg-secondary text-secondary-foreground font-medium"
                      : "text-muted-foreground",
                    collapsed ? "px-[14px]" : "px-3",
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {LinkContent}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className={cn(
                  "ml-2 font-medium z-[100]",
                  !collapsed && "hidden",
                )}
              >
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );

  return (
    <div className="min-h-screen flex bg-muted/40">
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-card p-4 sticky top-0 h-screen overflow-x-hidden overflow-y-auto transition-all duration-300 ease-in-out shrink-0",
          isCollapsed ? "w-20" : "w-64",
        )}
      >
        <div className="relative flex items-center h-10 mb-6 w-full">
          <Link
            href="/dashboard"
            className={cn(
              "absolute left-0 flex items-center gap-2 group overflow-hidden transition-all duration-300",
              isCollapsed
                ? "w-0 opacity-0 pointer-events-none"
                : "w-48 opacity-100",
            )}
          >
            {!imgError ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.5)] overflow-hidden shrink-0">
                <img
                  src={logoUrl}
                  alt="Borrowed Shapes Logo"
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold text-lg shadow-[0_0_15px_rgba(245,158,11,0.5)] shrink-0">
                B
              </div>
            )}
            <span className="font-extrabold tracking-tight flex flex-col justify-center leading-none text-sm ml-1 shrink-0">
              <span className="text-foreground dark:text-white">BORROWED</span>
              <span className="text-amber-500 dark:text-amber-400 mt-0.5">
                SHAPES
              </span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(
              "absolute shrink-0 transition-all duration-300",
              isCollapsed ? "left-[4px]" : "right-0",
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>
        </div>

        {renderNavItems(isCollapsed)}
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
                <SheetTitle className="text-left mb-6">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 group inline-flex"
                  >
                    {!imgError ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.5)] overflow-hidden shrink-0">
                        <img
                          src={logoUrl}
                          alt="Borrowed Shapes Logo"
                          className="w-full h-full object-cover"
                          onError={() => setImgError(true)}
                        />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold text-lg shadow-[0_0_15px_rgba(245,158,11,0.5)] shrink-0">
                        B
                      </div>
                    )}
                    <span className="font-extrabold tracking-tight flex flex-col justify-center leading-none text-sm ml-1">
                      <span className="text-foreground dark:text-white">
                        BORROWED
                      </span>
                      <span className="text-amber-500 dark:text-amber-400 mt-0.5">
                        SHAPES
                      </span>
                    </span>
                  </Link>
                </SheetTitle>
                {renderNavItems(false)}
              </SheetContent>
            </Sheet>
          </div>
          <div className="flex items-center gap-1">
            <LanguageDropdown />
            <ThemeToggle />
            <UserMenu
              displayName={user.displayName ?? ""}
              role={user.role}
              imgUrl={
                user.imgUrl && user.imgUrl.trim().length > 0
                  ? user.imgUrl.startsWith("http") ||
                    user.imgUrl.startsWith("/api/")
                    ? user.imgUrl
                    : `/api${user.imgUrl.startsWith("/") ? "" : "/"}${user.imgUrl}`
                  : undefined
              }
            />
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
