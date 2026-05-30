"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile, handleLogout } from "@/lib/api/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageDropdown } from "@/components/language-dropdown";

export default function Home() {
  const { t } = useI18n();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getUserProfile());
    setMounted(true);
    const handler = (e: any) => setUser(e.detail);
    window.addEventListener("api:profile-updated" as any, handler);
    return () => window.removeEventListener("api:profile-updated" as any, handler);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageDropdown />
        <ThemeToggle />
        {user && (
          <Button variant="destructive" size="sm" onClick={handleLogout}>
            {t("common.logout")}
          </Button>
        )}
      </div>

      <Card className="w-full max-w-md">
        <CardContent className="pt-10 pb-8 text-center space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t("auth.welcome_back")}
          </h1>
          <p className="text-muted-foreground">
            {user
              ? `${user.displayName} (${user.role})`
              : t("auth.login_subtitle")}
          </p>
          {!user && (
            <Button asChild size="lg" className="w-full">
              <Link href="/auth/login">{t("auth.login")}</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
