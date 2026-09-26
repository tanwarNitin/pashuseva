import { Metadata } from "next";
import { getDictionary } from "@/i18n/server";
import { getLocaleOrDefault } from "@/i18n/config";
import DiscoveryClient from "./discovery-client";
import { getCurrentSession } from "@/lib/auth/session";

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
    <div className="bg-gray-50">
      <main className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="text-center py-6 mb-2">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{dict.discovery.title}</h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm">
            {dict.discovery.subtitle}
          </p>
        </div>

        {/* Discovery Client Component - handles location, search input, filters, map & SOS modal */}
        <DiscoveryClient farmerId={farmerId} locale={locale} />
      </main>
    </div>
  );
}
