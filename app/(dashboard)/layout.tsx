"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Menu, LayoutDashboard, ClipboardList, BookOpen, Users, 
  MessageSquare, Flag, Tags, Trophy, Megaphone, Download, 
  Gamepad2, PanelLeftClose, PanelLeftOpen 
} from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile } from "@/lib/api/api-client";
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
    setMounted(true);
  }, [router]);

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
    { href: "/dashboard/audit-logs", label: t("admin.auditLogs.nav") || "Audit Log", icon: ClipboardList },
    { href: "/dashboard/wiki", label: t("header.wiki"), icon: BookOpen },
    { href: "/dashboard/accounts", label: t("admin.account.nav_label") || "Accounts", icon: Users },
    { href: "/dashboard/forums", label: t("forums.title") || "Forums", icon: MessageSquare },
    { href: "/dashboard/reports", label: t("reports.title") || "Reports", icon: Flag },
    { href: "/dashboard/categories", label: t("forums.dashboard.categories") || "Categories", icon: Tags },
    { href: "/dashboard/achievements", label: t("common.achievements"), icon: Trophy },
    { href: "/dashboard/announcements", label: t("common.announcements"), icon: Megaphone },
    { href: "/dashboard/downloads", label: t("admin.download.nav_label") || "Download", icon: Download },
    { href: "/dashboard/game-results", label: t("common.game_results"), icon: Gamepad2 },
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
            <Link href={item.href} className={cn("flex items-center", collapsed ? "justify-center" : "gap-3 w-full")}>
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant={active ? "secondary" : "ghost"}
                    className={cn(
                      "w-10 h-10 p-0 flex justify-center items-center mx-auto",
                      active && "bg-secondary text-secondary-foreground font-medium"
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    {LinkContent}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2 font-medium z-[100]">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Button
              key={item.href}
              asChild
              variant={active ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start px-3",
                active && "bg-secondary text-secondary-foreground font-medium"
              )}
              onClick={() => setMobileOpen(false)}
            >
              {LinkContent}
            </Button>
          );
        })}
      </nav>
    </TooltipProvider>
  );

  return (
    <div className="min-h-screen flex bg-muted/40">
      <aside 
        className={cn(
          "hidden md:flex flex-col border-r bg-card p-4 sticky top-0 h-screen overflow-y-auto transition-all duration-300 ease-in-out shrink-0",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className={cn("flex items-center mb-6", isCollapsed ? "justify-center" : "justify-between")}>
          {!isCollapsed && (
            <h2 className="text-xl font-bold px-2 hover:opacity-80 transition-opacity whitespace-nowrap overflow-hidden text-ellipsis">
              <Link href="/">Admin Panel</Link>
            </h2>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="shrink-0"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
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
                <SheetTitle className="text-xl font-bold mb-6 hover:opacity-80 transition-opacity text-left">
                  <Link href="/">Admin Panel</Link>
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
              imgUrl={user.imgUrl && user.imgUrl.trim().length > 0 ? (user.imgUrl.startsWith('http') || user.imgUrl.startsWith('/api/') ? user.imgUrl : `/api${user.imgUrl.startsWith('/') ? '' : '/'}${user.imgUrl}`) : undefined}
            />
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
