"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile, handleLogout } from "@/lib/api/api-client";
import { useEffect, useState } from "react";

export default function Home() {
  const { t, locale, setLocale } = useI18n();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getUserProfile());

    const handleProfileUpdate = (event: any) => {
      setUser(event.detail);
    };

    window.addEventListener("api:profile-updated" as any, handleProfileUpdate);
    return () => {
      window.removeEventListener("api:profile-updated" as any, handleProfileUpdate);
    };
  }, []);

  const toggleLang = () => {
    setLocale(locale === "en" ? "vi" : "en");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-white text-gray-800">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex mb-12">
        <button
          onClick={toggleLang}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-full transition-all font-bold"
        >
          {t("common.switch_lang")}
        </button>

        {user && (
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-all"
          >
            {t("common.logout")}
          </button>
        )}
      </div>

      <div className="text-center">
        <h1 className="text-6xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {t("auth.welcome_back")}
        </h1>
        <p className="text-xl text-gray-500 mb-8">
          {user
            ? `${user.displayName} (${user.role})`
            : "Please login to continue"}
        </p>

        {!user && (
          <a
            href="/auth/login"
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            {t("auth.login")}
          </a>
        )}
      </div>
    </main>
  );
}
