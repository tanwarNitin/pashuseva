import { Metadata } from "next";
import { getDictionary } from "@/i18n/server";
import { getLocaleOrDefault } from "@/i18n/config";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import ProviderDashboardClient from "./dashboard-client";
import { PageShell } from "@/components/layout/page-shell";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);
  return {
    title: `${dict.provider.dashboard} | ${dict.common.appName}`,
    description: "Provider dashboard for managing service requests",
  };
}

export default async function ProviderDashboardPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/${locale}/login`);
  }
  if (session.user.role !== "VET_DOCTOR" && session.user.role !== "PARAVET_WORKER") {
    redirect(`/${locale}/discover`);
  }

  return (
    <PageShell
      title={dict.provider.dashboard}
      subtitle={dict.provider.incomingRequests}
    >
      <ProviderDashboardClient dict={dict} locale={locale} />
    </PageShell>
  );
}