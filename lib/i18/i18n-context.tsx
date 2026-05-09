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

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Ưu tiên lấy từ cookie, nếu không có thì lấy ngôn ngữ hệ thống hoặc mặc định 'en'
  const [locale, setLocaleState] = useState<Language>("en");

  useEffect(() => {
    const savedLocale = Cookies.get("NEXT_LOCALE") as Language;
    if (savedLocale && (savedLocale === "en" || savedLocale === "vi")) {
      setLocaleState(savedLocale);
    }
  }, []);

  const setLocale = (lang: Language) => {
    setLocaleState(lang);
    Cookies.set("NEXT_LOCALE", lang, { expires: 365 });
    // Tải lại trang để áp dụng ngôn ngữ mới (tùy chọn, nhưng sạch sẽ cho middleware/api)
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
