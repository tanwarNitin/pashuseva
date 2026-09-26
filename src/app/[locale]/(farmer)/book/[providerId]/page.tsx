import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/db";
import { users, providerProfiles, animals } from "@/db/schema";
import { eq } from "drizzle-orm";
import BookRoutineClient from "./book-routine-client";
import { getDictionary } from "@/i18n/server";
import type { Locale } from "@/i18n/config";

interface PageProps {
  params: Promise<{
    locale: Locale;
    providerId: string;
  }>;
}

export default async function BookRoutinePage({ params }: PageProps) {
  const resolvedParams = await params;
  const session = await getCurrentSession();
  
  if (!session) {
    redirect(`/${resolvedParams.locale}/login`);
  }
  
  if (session.user.role !== "FARMER") {
    redirect(`/${resolvedParams.locale}/discover`);
  }

  // Fetch provider info
  const [provider] = await db
    .select({
      id: users.id,
      name: users.name,
      qualification: providerProfiles.qualification,
      providerType: users.role,
      baseVisitFeePaise: providerProfiles.baseVisitFeePaise,
    })
    .from(users)
    .innerJoin(providerProfiles, eq(users.id, providerProfiles.userId))
    .where(eq(users.id, resolvedParams.providerId))
    .limit(1);

  if (!provider) {
    notFound();
  }

  // Fetch farmer's animals
  const farmerAnimals = await db
    .select({
      id: animals.id,
      name: animals.name,
      tagId: animals.tagId,
    })
    .from(animals)
    .where(eq(animals.farmerId, session.user.id));

  return (
    <div className="container max-w-2xl py-8">
      <BookRoutineClient 
        provider={{
          ...provider,
          baseVisitFeePaise: provider.baseVisitFeePaise ?? 0
        }} 
        animals={farmerAnimals} 
        locale={resolvedParams.locale} 
      />
    </div>
  );
}
