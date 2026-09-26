import { redirect } from "next/navigation";
import { getLocaleOrDefault } from "@/i18n/config";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

export default async function LocalePage({ params }: LocalePageProps) {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  redirect(`/${locale}/discover`);
}
