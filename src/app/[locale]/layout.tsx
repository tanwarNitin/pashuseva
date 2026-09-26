import type { Metadata } from "next";
import { getDictionary } from "@/i18n/server";
import { getLocaleOrDefault } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";
import { Header } from "@/components/layout/header";
import { getCurrentSession } from "@/lib/auth/session";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);
  return {
    title: dict.common.appName,
    description: "PashuSeva - Veterinary Discovery Platform",
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);
  const session = await getCurrentSession();

  const user = session
    ? {
        id: session.user.id,
        name: session.user.name,
        phone: session.user.phone,
        role: session.user.role,
      }
    : null;

  return (
    <I18nProvider locale={locale} messages={dict}>
      <div className="min-h-screen bg-gray-50 antialiased flex flex-col">
        <Header user={user} />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </I18nProvider>
  );
}