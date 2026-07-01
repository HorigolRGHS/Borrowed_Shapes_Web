"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
import en from "@/locales/en.json";
import vi from "@/locales/vi.json";

type Language = "en" | "vi";
const translations = { en, vi };

interface I18nContextType {
  locale: Language;
  t: (key: string, vars?: Record<string, string | number>) => string;
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
    const wikiData = window.__wikiSlugData;
    if (wikiData) {
      const targetSlug = lang === "vi" ? wikiData.slugVi : wikiData.slug;
      const targetUrl = `/wiki/${encodeURIComponent(targetSlug)}${wikiData.pathSuffix}`;
      window.location.href = targetUrl;
      return;
    }

    window.location.reload();
  };

  const t = (path: string, vars?: Record<string, string | number>) => {
    const keys = path.split(".");
    let result: any = translations[locale];
    for (const key of keys) {
      result = result?.[key];
    }
    
    let text = result || path;
    if (typeof text === 'string' && vars) {
      return Object.entries(vars).reduce(
        (res, [k, v]) => res.replaceAll(`{${k}}`, String(v)),
        text
      );
    }
    
    return text;
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
