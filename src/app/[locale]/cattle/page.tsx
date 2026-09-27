
import { Metadata } from "next";
import { getDictionary } from "@/i18n/server";
import { getLocaleOrDefault } from "@/i18n/config";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { animals, vaccinationRecords } from "@/db/schema";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { VaccinationReminders } from "./_components/vaccination-reminders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Activity, Edit, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);
  return {
    title: `${dict.nav.cattle} | ${dict.common.appName}`,
    description: "Your cattle health records",
  };
}

export default async function CattleListPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/${locale}/login`);
  }
  if (session.user.role !== "FARMER") {
    redirect(`/${locale}/discover`);
  }

  const farmerAnimals = await db
    .select({
      id: animals.id,
      name: animals.name,
      tagId: animals.tagId,
      species: animals.species,
      breed: animals.breed,
      sex: animals.sex,
      dateOfBirth: animals.dateOfBirth,
      colorOrIdentifyingMarks: animals.colorOrIdentifyingMarks,
      notes: animals.notes,
      createdAt: animals.createdAt,
    })
    .from(animals)
    .where(
      and(
        eq(animals.farmerId, session.user.id),
        isNull(animals.archivedAt)
      )
    )
    .orderBy(animals.createdAt);

  const rawReminders = await db
    .select({
      id: vaccinationRecords.id,
      animalId: animals.id,
      animalName: animals.name,
      tagId: animals.tagId,
      vaccineName: vaccinationRecords.vaccineName,
      nextDueOn: vaccinationRecords.nextDueOn,
    })
    .from(vaccinationRecords)
    .innerJoin(animals, eq(vaccinationRecords.animalId, animals.id))
    .where(
      and(
        eq(vaccinationRecords.farmerId, session.user.id),
        eq(vaccinationRecords.reminderDismissed, false),
        isNull(animals.archivedAt),
        isNotNull(vaccinationRecords.nextDueOn)
      )
    );

  const todayStr = new Date().toISOString().split("T")[0];
  const fourteenDaysFromNow = new Date();
  fourteenDaysFromNow.setUTCDate(fourteenDaysFromNow.getUTCDate() + 14);
  const fourteenDaysStr = fourteenDaysFromNow.toISOString().split("T")[0];

  const activeReminders = rawReminders
    .filter((r) => r.nextDueOn && r.nextDueOn <= fourteenDaysStr)
    .map((r) => ({
      ...r,
      animalName: r.animalName || "",
      nextDueOn: r.nextDueOn as string,
      isOverdue: (r.nextDueOn as string) < todayStr,
    }))
    .sort((a, b) => a.nextDueOn.localeCompare(b.nextDueOn));

  const getSpeciesLabel = (species: string) => {
    const speciesMap: Record<string, string> = {
      CATTLE: dict.cattle.species.cattle,
      BUFFALO: dict.cattle.species.buffalo,
      GOAT: dict.cattle.species.goat,
      SHEEP: dict.cattle.species.sheep,
      OTHER: dict.cattle.species.other,
    };
    return speciesMap[species] || species;
  };

  const getSexLabel = (sex: string) => {
    const sexMap: Record<string, string> = {
      MALE: dict.cattle.male,
      FEMALE: dict.cattle.female,
      OTHER: dict.cattle.unknown,
    };
    return sexMap[sex] || dict.cattle.unknown;
  };

  return (
    <PageShell
      title={dict.nav.cattle}
      subtitle={dict.cattle.subtitle || "Manage your livestock health records"}
      primaryAction={
        <Link href={`/${locale}/cattle/add`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            {dict.cattle.addAnimal}
          </Button>
        </Link>
      }
    >
      <VaccinationReminders reminders={activeReminders} locale={locale} dict={dict} />

        {farmerAnimals.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">{dict.cattle.noAnimals || "No animals registered"}</h3>
                <p className="text-sm text-muted-foreground mb-4">{dict.cattle.noAnimalsDesc || "Add your first animal to start tracking health records"}</p>
                <Link href={`/${locale}/cattle/add`}>
                  <Button variant="outline">{dict.cattle.addAnimal}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {farmerAnimals.map((animal) => (
              <Card key={animal.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{animal.name || dict.cattle.unnamed || "Unnamed"}</CardTitle>
                      <CardDescription>{dict.cattle.tagNumber}: {animal.tagId}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{getSpeciesLabel(animal.species)}</Badge>
                      <Badge variant="outline">{getSexLabel(animal.sex)}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      <span>{animal.breed || dict.cattle.unknown}</span>
                    </div>
                    {animal.dateOfBirth && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(animal.dateOfBirth).toLocaleDateString(locale)}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {animal.notes ? animal.notes.substring(0, 50) + "..." : dict.cattle.noNotes}
                    </div>
                    <Link href={`/${locale}/cattle/${animal.id}`}>
                      <Button variant="ghost" size="sm">
                        {dict.cattle.viewDetails || "View Health Card"}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </PageShell>
  );
}
