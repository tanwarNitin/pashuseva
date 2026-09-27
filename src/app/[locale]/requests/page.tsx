import { Metadata } from "next";
import { getDictionary } from "@/i18n/server";
import { getLocaleOrDefault } from "@/i18n/config";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getFarmerRequests } from "@/services/request.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Stethoscope, Phone, MessageCircle, Clock, MapPin, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFarmerRoutineBookings } from "@/actions/routine.actions";
import RoutineClient from "./routine-client";
import { PageShell } from "@/components/layout/page-shell";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = getLocaleOrDefault(localeParam);
  const dict = await getDictionary(locale);
  return {
    title: `${dict.nav.requests} | ${dict.common.appName}`,
    description: "Your service requests",
  };
}

function getRequestStatusBadge(status: string, dict: any) {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PENDING: { label: dict.requests.status.pending, variant: "outline" },
    ACCEPTED: { label: dict.requests.status.accepted, variant: "default" },
    IN_PROGRESS: { label: dict.requests.status.inProgress, variant: "default" },
    COMPLETED: { label: dict.requests.status.completed, variant: "secondary" },
    DECLINED: { label: dict.requests.status.declined, variant: "outline" },
    EXPIRED: { label: dict.requests.status.expired, variant: "outline" },
    CANCELLED: { label: dict.requests.status.cancelled, variant: "destructive" },
  };

  const config = statusConfig[status] || { label: status, variant: "outline" };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

import { PushToggle } from "@/components/ui/push-toggle";

export default async function RequestsPage({ params }: PageProps) {
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

  const requests = await getFarmerRequests(session.user.id, session.user.id);
  const routineBookings = await getFarmerRoutineBookings();

  return (
    <PageShell
      title={dict.nav.requests}
      subtitle={dict.requests.subtitle}
      primaryAction={
        <div className="flex items-center gap-4">
          <PushToggle />
          <Link href={`/${locale}/discover`}>
            <Button>{dict.requests.createRequest}</Button>
          </Link>
        </div>
      }
    >
      <Tabs defaultValue="routine" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="routine">{dict.discovery.routine}</TabsTrigger>
            <TabsTrigger value="sos">{dict.discovery.emergency}</TabsTrigger>
          </TabsList>

          <TabsContent value="routine">
            <RoutineClient bookings={routineBookings} locale={locale} />
          </TabsContent>

          <TabsContent value="sos">
            {requests.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">{dict.requests.noRequests}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{dict.requests.noRequestsDesc}</p>
                    <Link href={`/${locale}/discover`}>
                      <Button>{dict.requests.createRequest}</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{request.animalName || dict.requests.animalUnknown}</CardTitle>
                          <CardDescription>{dict.requests.requestId}: {request.id.slice(0, 8)}...</CardDescription>
                        </div>
                        {getRequestStatusBadge(request.status, dict)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Stethoscope className="w-4 h-4" />
                          <span>{request.kind === "SOS" ? dict.requests.emergency : dict.requests.routine}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(request.createdAt).toLocaleDateString(locale)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{request.locationDescription || request.locationSource}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Service: {request.serviceCode}
                        </div>
                        <Link href={`/${locale}/cattle/${request.animalId}`}>
                          <Button variant="ghost" size="sm">
                            {dict.requests.viewDetails}
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
    </PageShell>
  );
}
