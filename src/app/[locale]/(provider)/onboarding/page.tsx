import { Metadata } from "next";
import { OnboardingForm } from "@/components/providers/onboarding-form";
import { getDictionary } from "@/i18n/server";
import { getLocaleOrDefault } from "@/i18n/config";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { providerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageShell } from "@/components/layout/page-shell";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);
  return {
    title: dict.provider.onboarding.title,
    description: dict.provider.onboarding.subtitle,
  };
}

export default async function OnboardingPage({ params }: PageProps) {
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

  // Check if provider is already verified
  const [profile] = await db
    .select({ verificationStatus: providerProfiles.verificationStatus })
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, session.user.id))
    .limit(1);

  if (profile && (profile.verificationStatus === "VERIFIED" || profile.verificationStatus === "SUSPENDED")) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <PageShell
      title={dict.provider.onboarding.title}
      subtitle={dict.provider.onboarding.subtitle}
      className="max-w-3xl"
    >
      <div className="bg-card rounded-xl shadow-sm border border-border p-6 sm:p-8">
        <OnboardingForm locale={locale} dict={dict.provider.onboarding} />
      </div>
    </PageShell>
  );
}
