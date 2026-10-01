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
    <main className="min-h-screen bg-background flex flex-col">
      {/* Compact Branded Strip */}
      <div className="bg-primary border-b border-border py-4 relative overflow-hidden shrink-0">
        <div className="container mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-primary-foreground tracking-tight">
              {dict.discovery.title}
            </h1>
            <p className="text-sm md:text-base text-primary-foreground/90 font-medium">
              {dict.discovery.subtitle}
            </p>
          </div>
        </div>
        {/* Subtle decorative element */}
        <div className="absolute right-0 top-0 w-32 h-full bg-white/10 skew-x-12 translate-x-4"></div>
      </div>

      {/* Main Content Area - Fill remaining height */}
      <div className="container mx-auto px-4 py-4 md:py-6 flex-1 flex flex-col">
        <DiscoveryClient farmerId={farmerId} locale={locale} />
      </div>
    </main>
  );
}
