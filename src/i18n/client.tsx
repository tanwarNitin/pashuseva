"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dictionary } from "./dictionaries/en";
import type { Locale } from "./config";

type I18nContextType = {
  locale: Locale;
  dictionary: Dictionary;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Dictionary;
  children: ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, dictionary: messages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}

export function useTranslation() {
  const { dictionary } = useI18n();
  return dictionary;
}

export function useLocale() {
  const { locale } = useI18n();
  return locale;
}
