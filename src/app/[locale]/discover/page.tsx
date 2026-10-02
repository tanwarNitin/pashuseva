import { Metadata } from "next";
import { getDictionary } from "@/i18n/server";
import { getLocaleOrDefault } from "@/i18n/config";
import DiscoveryClient from "./discovery-client";
import { getCurrentSession } from "@/lib/auth/session";

import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);
  return {
    title: `${dict.discovery.title} | ${dict.common.appName}`,
    description: dict.discovery.subtitle,
  };
}

export default async function DiscoverPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const session = await getCurrentSession();

  if (session?.user && (session.user.role === "VET_DOCTOR" || session.user.role === "PARAVET_WORKER")) {
    redirect(`/${locale}/dashboard`);
  }

  const farmerId = session?.user?.id || null;

  return (
    <main className="relative flex-1 flex flex-col w-full h-[calc(100dvh-64px)] overflow-hidden bg-background">
      <DiscoveryClient farmerId={farmerId} locale={locale} />
    </main>
  );
}
