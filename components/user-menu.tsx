"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Lock, LogOut, User, Download, LayoutDashboard, Home } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { handleLogout, getUserProfile } from "@/lib/api/api-client";
import { useI18n } from "@/lib/i18/i18n-context";

interface Props {
  displayName: string;
  role?: string;
  imgUrl?: string;
}

export function UserMenu({ displayName, role, imgUrl }: Props) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [imgError, setImgError] = useState(false);
  const initials = displayName
    ? displayName.substring(0, 2).toUpperCase()
    : "US";

  // For email display, let's try to get from local user profile if available
  let email = "";
  let badgeImageUrl = "";
  if (typeof window !== "undefined") {
    const p = getUserProfile();
    if (p && p.email) {
      email = p.email;
    }
    if (p && p.equippedAchievement?.badgeImageUrl) {
      badgeImageUrl = p.equippedAchievement.badgeImageUrl;
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 group p-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
        <div className="relative flex h-10 w-10 items-center justify-center">
          <div className={`absolute left-1/2 top-1/2 w-[72%] h-[72%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold text-xs shadow-md overflow-hidden z-0 flex items-center justify-center ${badgeImageUrl ? "rounded-md" : "rounded-full"}`}>
            {imgUrl && !imgError ? (
              <img src={imgUrl} alt={displayName} className="w-full h-full object-cover" onError={() => setImgError(true)} />
            ) : (
              initials
            )}
          </div>
          {badgeImageUrl && (
            <img 
              src={badgeImageUrl} 
              alt="" 
              aria-hidden="true" 
              className="pointer-events-none absolute inset-0 z-10 w-full h-full object-contain drop-shadow-sm" 
            />
          )}
        </div>
        <span className="max-w-[12ch] truncate text-sm font-medium text-foreground hidden sm:block">
          {displayName}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 bg-card border-border dark:bg-[#0f0f1a] dark:border-[#1e1e3a] text-foreground dark:text-white rounded-xl shadow-2xl p-2 mt-2">
        <DropdownMenuLabel className="px-2 py-3 flex flex-col gap-1">
          <span className="font-bold truncate">{displayName}</span>
          {email && (
            <span className="text-xs text-muted-foreground dark:text-gray-400 truncate">{email}</span>
          )}
          {role && (
            <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider mt-1">
              {role.toUpperCase() === "ADMIN"
                ? t("profile.role.admin") || "Admin"
                : role.toUpperCase() === "USER"
                ? t("profile.role.user") || "User"
                : role}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border dark:bg-[#1e1e3a]" />

        {role === "ADMIN" && (
          pathname?.startsWith("/dashboard") ? (
            <DropdownMenuItem asChild className="cursor-pointer focus:bg-accent focus:text-accent-foreground dark:focus:bg-white/5 dark:focus:text-white rounded-lg px-3 py-2.5 mt-1">
              <Link href="/" className="flex items-center gap-3">
                <Home className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                {t("common.home") || "Home"}
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild className="cursor-pointer focus:bg-accent focus:text-accent-foreground dark:focus:bg-white/5 dark:focus:text-white rounded-lg px-3 py-2.5 mt-1">
              <Link href="/dashboard" className="flex items-center gap-3">
                <LayoutDashboard className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                {t("nav.dashboard") || "Dashboard"}
              </Link>
            </DropdownMenuItem>
          )
        )}

        <DropdownMenuItem asChild className="cursor-pointer focus:bg-accent focus:text-accent-foreground dark:focus:bg-white/5 dark:focus:text-white rounded-lg px-3 py-2.5 mt-1">
          <Link href="/profile" className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
            {t("profile.title") || "Profile"}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="cursor-pointer focus:bg-accent focus:text-accent-foreground dark:focus:bg-white/5 dark:focus:text-white rounded-lg px-3 py-2.5">
          <Link href="/download" className="flex items-center gap-3">
            <Download className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
            {t("header.download") || "Download"}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="cursor-pointer focus:bg-accent focus:text-accent-foreground dark:focus:bg-white/5 dark:focus:text-white rounded-lg px-3 py-2.5 mb-1">
          <Link href="/auth/change-password" className="flex items-center gap-3">
            <Lock className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
            {t("auth.change_password") || "Change Password"}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border dark:bg-[#1e1e3a]" />

        <DropdownMenuItem
          onClick={() => handleLogout()}
          className="cursor-pointer focus:bg-destructive/10 focus:text-destructive dark:focus:bg-red-500/10 dark:focus:text-red-400 text-destructive dark:text-red-500 rounded-lg px-3 py-2.5 mt-1"
        >
          <LogOut className="h-4 w-4 mr-3" />
          {t("common.logout") || "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
