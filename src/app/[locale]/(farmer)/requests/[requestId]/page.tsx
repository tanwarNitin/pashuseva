import { Metadata } from "next";
import { getDictionary } from "@/i18n/server";
import { getLocaleOrDefault } from "@/i18n/config";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import RequestTrackingClient from "@/components/farmer/request-tracking-client";
import { PageShell } from "@/components/layout/page-shell";

interface PageProps {
  params: Promise<{ locale: string; requestId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam, requestId } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);
  return {
    title: `Track Request ${requestId.substring(0, 8)} | ${dict.common.appName}`,
  };
}

export default async function RequestTrackingPage({ params }: PageProps) {
  const { locale: localeParam, requestId } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/${locale}/login`);
  }

  return (
    <PageShell>
      <RequestTrackingClient requestId={requestId} />
    </PageShell>
  );
}
