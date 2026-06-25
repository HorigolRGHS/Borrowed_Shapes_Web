"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageDropdown } from "@/components/language-dropdown";
import { UserMenu } from "@/components/user-menu";
import { getUserProfile } from "@/lib/api/api-client";
import { useI18n } from "@/lib/i18/i18n-context";

interface UserProfile {
  displayName?: string;
  role?: string;
  imgUrl?: string;
}

export function PublicHeader() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getUserProfile() as UserProfile | null);
    setMounted(true);
    const handler = (e: any) => setUser(e.detail);
    window.addEventListener("api:profile-updated" as any, handler);
    
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("api:profile-updated" as any, handler);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const navLinks = [
    { href: "/", label: t("header.home") || "Home" },
    { href: "/wiki", label: t("header.wiki") || "Wiki" },
    { href: "/forums", label: t("header.forum") || "Forum" },
    { href: "/leaderboard", label: t("header.leaderboard") || "Leaderboard" },
    { href: "/download", label: t("header.download") || "Download" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 w-full h-16 flex items-center ${
          scrolled
            ? "bg-background/95 backdrop-blur-md border-b border-border shadow-md dark:bg-[#07070f]/95 dark:border-[#1e1e3a] dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
            : "bg-transparent border-transparent"
        }`}
      >
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold text-lg shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                B
              </div>
              <span className="font-extrabold tracking-tight hidden sm:inline-block">
                <span className="text-foreground dark:text-white">BORROWED</span>{" "}
                <span className="text-amber-500 dark:text-amber-400">SHAPES</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              {navLinks.map((link) => {
                const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-4 py-2 text-sm rounded-md group transition-colors ${
                      isActive ? "text-foreground dark:text-white" : "text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    {link.label}
                    <span
                      className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 transition-transform origin-left ${
                        isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <LanguageDropdown />
              <ThemeToggle />
            </div>

            {mounted && user ? (
              <UserMenu displayName={user.displayName ?? ""} role={user.role} imgUrl={user.imgUrl} />
            ) : (
              mounted && (
                <div className="hidden sm:flex items-center gap-2 ml-2">
                  <Link
                    href="/auth/login"
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-white transition-colors"
                  >
                    {t("auth.login")}
                  </Link>
                  <Link
                    href="/auth/register"
                    className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-white rounded-lg transition-all"
                  >
                    {t("header.join_now")}
                  </Link>
                </div>
              )
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-white"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 md:hidden bg-background/98 dark:bg-[#07070f]/98 backdrop-blur-md border-t border-border dark:border-[#1e1e3a] flex flex-col pt-4 px-4 overflow-y-auto">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => {
              const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground dark:bg-white/5 dark:text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-border dark:border-[#1e1e3a] pt-6 flex flex-col gap-4">
            <div className="flex items-center gap-4 px-4">
              <LanguageDropdown />
              <ThemeToggle />
            </div>

            {mounted && !user && (
              <div className="flex flex-col gap-3 px-2 mt-4">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 text-center text-sm font-medium text-muted-foreground hover:text-foreground bg-accent/50 hover:bg-accent dark:text-gray-400 dark:hover:text-white dark:bg-white/5 rounded-lg transition-colors"
                >
                  {t("auth.login")}
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 text-center text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-white rounded-lg transition-all"
                >
                  {t("header.join_now")}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
