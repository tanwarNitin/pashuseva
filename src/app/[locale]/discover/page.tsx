import { Metadata } from "next";
import { getDictionary } from "@/i18n/server";
import { getLocaleOrDefault } from "@/i18n/config";
import DiscoveryClient from "./discovery-client";
import { getCurrentSession } from "@/lib/auth/session";
import { PageShell } from "@/components/layout/page-shell";

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
  const dict = await getDictionary(locale);
  const session = await getCurrentSession();
  const farmerId = session?.user?.id || null;

  return (
    <PageShell
      title={dict.discovery.title}
      subtitle={dict.discovery.subtitle}
    >
      <DiscoveryClient farmerId={farmerId} locale={locale} />
    </PageShell>
  );
}
