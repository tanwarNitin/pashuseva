import { redirect } from "next/navigation";
import { getLocaleOrDefault } from "@/i18n/config";

import { getCurrentSession } from "@/lib/auth/session";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

export default async function LocalePage({ params }: LocalePageProps) {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const session = await getCurrentSession();

  if (session?.user && (session.user.role === "VET_DOCTOR" || session.user.role === "PARAVET_WORKER")) {
    redirect(`/${locale}/dashboard`);
  }

  redirect(`/${locale}/discover`);
}
