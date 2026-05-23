"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile, handleLogout } from "@/lib/api/api-client";

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

  useEffect(() => {
    const profile = getUserProfile() as UserProfile | null;
    if (!profile || profile.role !== "ADMIN") {
      router.push("/");
      return;
    }
    setUser(profile);
    setMounted(true);
  }, [router]);

  if (!mounted || !user) return null;

  const navItems: { href: string; label: string }[] = [
    { href: "/dashboard", label: t("common.dashboard") },
    { href: "/dashboard/wiki", label: "Wiki" },
  ];

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-slate-900 text-white p-6 hidden md:block">
        <h2 className="text-2xl font-bold mb-10">Admin Panel</h2>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block p-3 rounded-lg transition ${
                isActive(item.href)
                  ? "bg-blue-600"
                  : "hover:bg-slate-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8">
          <h1 className="text-xl font-bold text-gray-800">
            {t("common.dashboard")}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600">
              {user.displayName}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:underline"
            >
              {t("common.logout")}
            </button>
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
