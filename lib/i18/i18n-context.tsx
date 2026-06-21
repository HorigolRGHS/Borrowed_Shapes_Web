"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
import en from "@/locales/en.json";
import vi from "@/locales/vi.json";

type Language = "en" | "vi";
const translations = { en, vi };

interface I18nContextType {
  locale: Language;
  t: (key: string) => string;
  setLocale: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ 
  children, 
  initialLocale = "en" 
}: { 
  children: React.ReactNode;
  initialLocale?: Language;
}) {
  const [locale, setLocaleState] = useState<Language>(initialLocale);

  const setLocale = (lang: Language) => {
    setLocaleState(lang);
    Cookies.set("NEXT_LOCALE", lang, { expires: 365 });

    // Check if we're on a wiki page with alternate locale slug
    const wikiData = (window as any).__wikiSlugData as { slug: string; slugVi: string; pathSuffix: string } | undefined;
    if (wikiData) {
      const targetSlug = lang === "vi" ? wikiData.slugVi : wikiData.slug;
      const targetUrl = `/wiki/${encodeURIComponent(targetSlug)}${wikiData.pathSuffix}`;
      window.location.href = targetUrl;
      return;
    }

    window.location.reload();
  };

  const t = (path: string) => {
    const keys = path.split(".");
    let result: any = translations[locale];
    for (const key of keys) {
      result = result?.[key];
    }
    return result || path;
  };

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
