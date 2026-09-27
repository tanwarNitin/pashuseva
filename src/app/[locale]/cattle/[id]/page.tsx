import { Metadata } from "next";
import { getDictionary } from "@/i18n/server";
import { getLocaleOrDefault } from "@/i18n/config";
import CattleHealthCardClient from "./health-card-client";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { animals, healthCardConsents, serviceRequests } from "@/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { AlertTriangle } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);
  return {
    title: `${dict.cattle.healthCard} | ${dict.common.appName}`,
    description: "Cattle health card - Pashu Swasthya Patra",
  };
}

export default async function CattleHealthCardPage({ params }: PageProps) {
  const { locale: localeParam, id } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/${locale}/login`);
  }
  
  const [animal] = await db
    .select()
    .from(animals)
    .where(eq(animals.id, id))
    .limit(1);

  if (!animal) {
    notFound();
  }

  let hasAccess = false;

  if (session.user.role === "FARMER") {
    hasAccess = animal.farmerId === session.user.id;
  } else if (session.user.role === "VET_DOCTOR" || session.user.role === "PARAVET_WORKER") {
    // Check for active grant
    const [grant] = await db
      .select()
      .from(healthCardConsents)
      .where(
        and(
          eq(healthCardConsents.animalId, animal.id),
          eq(healthCardConsents.providerId, session.user.id),
          isNull(healthCardConsents.revokedAt)
        )
      )
      .limit(1);

    if (grant) {
      hasAccess = true;
    } else {
      // Check for active service request assignment
      const [activeRequest] = await db
        .select()
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.animalId, animal.id),
            eq(serviceRequests.acceptedProviderId, session.user.id),
            inArray(serviceRequests.status, ["PENDING_ACCEPTANCE", "ACCEPTED", "IN_TRANSIT", "ARRIVED"])
          )
        )
        .limit(1);
        
      if (activeRequest) {
        hasAccess = true;
      }
    }
  }

  if (!hasAccess) {
    // If not a farmer/provider at all, or just unauthorized farmer
    if (session.user.role === "FARMER" || session.user.role === "ADMIN") {
      notFound();
    }
    
    // Provider without access gets the access required message
    // (Note: we don't set a 403 HTTP status natively here without throwing, but we render a clear UI)
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full bg-card shadow-sm border border-border rounded-lg p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {dict.cattle.accessRequired || "Access Required"}
          </h1>
          <p className="text-muted-foreground">
            {dict.cattle.accessRequiredDesc || "You do not have permission to view this health card. Please ask the farmer to grant you access."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <PageShell>
      <CattleHealthCardClient animal={animal} isProvider={session.user.role !== "FARMER"} />
    </PageShell>
  );
}
