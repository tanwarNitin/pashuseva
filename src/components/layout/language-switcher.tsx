"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { Globe } from "lucide-react";
import { locales, type Locale } from "@/i18n/config";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const otherLocale = locale === "en" ? "hi" : "en";

  const switchLocale = () => {
    // Replace the locale in the pathname
    const newPathname = pathname.replace(`/${locale}`, `/${otherLocale}`);
    const searchString = searchParams.toString();
    const url = searchString ? `${newPathname}?${searchString}` : newPathname;
    router.push(url);
  };

  const localeLabels: Record<Locale, string> = {
    en: "English",
    hi: "हिंदी",
  };

  return (
    <button
      onClick={switchLocale}
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
      aria-label={`Switch to ${localeLabels[otherLocale]}`}
    >
      <Globe className="w-4 h-4" aria-hidden="true" />
      <span className="hidden sm:inline">{localeLabels[otherLocale]}</span>
    </button>
  );
}