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
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-primary overflow-hidden border-b border-border">
        {/* Decorative background shapes */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-black/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground tracking-tight mb-6 max-w-3xl">
            {dict.discovery.title}
          </h1>
          <p className="text-xl md:text-2xl text-primary-foreground/90 max-w-2xl font-medium">
            {dict.discovery.subtitle}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-8 -mt-8 relative z-20">
        <DiscoveryClient farmerId={farmerId} locale={locale} />
      </div>
    </main>
  );
}
