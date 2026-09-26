// i18n configuration
export const locales = ["en", "hi"] as const;
export const defaultLocale = "en" as const;

export type Locale = (typeof locales)[number];

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function getLocaleOrDefault(locale?: string): Locale {
  if (locale && isValidLocale(locale)) {
    return locale;
  }
  return defaultLocale;
}
