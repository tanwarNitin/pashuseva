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
import { PushToggle } from "@/components/ui/push-toggle";

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
    PENDING: { label: `⏳ ${dict.requests.status.pending}`, variant: "outline" },
    ACCEPTED: { label: `✅ ${dict.requests.status.accepted}`, variant: "default" },
    IN_PROGRESS: { label: `✅ ${dict.requests.status.inProgress}`, variant: "default" },
    COMPLETED: { label: `✅ ${dict.requests.status.completed}`, variant: "secondary" },
    DECLINED: { label: `❌ ${dict.requests.status.declined}`, variant: "outline" },
    EXPIRED: { label: `❌ ${dict.requests.status.expired}`, variant: "outline" },
    CANCELLED: { label: `❌ ${dict.requests.status.cancelled}`, variant: "destructive" },
  };

  const config = statusConfig[status] || { label: status, variant: "outline" };
  return <Badge variant={config.variant} className="uppercase tracking-kicker text-xs font-medium">{config.label}</Badge>;
}

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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        {/* Left Column - Dashboard Sidebar/Info */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-primary/5 border-primary/20 shadow-none">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-foreground" />
                {dict.nav.requests}
              </CardTitle>
              <CardDescription>
                {dict.requests.subtitle}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-base font-semibold text-kicker border-b pb-2">
                <span>{dict.discovery.routine}</span>
                <Badge variant="secondary" className="font-semibold text-base tabular-nums">{routineBookings.length}</Badge>
              </div>
              <div className="flex items-center gap-2 text-base font-semibold text-kicker border-b pb-2">
                <span>{dict.discovery.emergency}</span>
                <Badge variant="secondary" className="font-semibold text-base tabular-nums">{requests.length}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Main Content (Tabs) */}
        <div className="lg:col-span-8">
          <Tabs defaultValue="routine" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px] h-12 rounded-full p-1 bg-muted/50 border border-border">
              <TabsTrigger value="routine" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">
                {dict.discovery.routine}
              </TabsTrigger>
              <TabsTrigger value="sos" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">
                {dict.discovery.emergency}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="routine" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
              <RoutineClient bookings={routineBookings} locale={locale} />
            </TabsContent>

            <TabsContent value="sos" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
              {requests.length === 0 ? (
                <Card className="border-dashed shadow-none bg-muted/20">
                  <CardContent className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="bg-background w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-border shadow-sm">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{dict.requests.noRequests}</h3>
                      <p className="text-base text-foreground mb-6 max-w-sm mx-auto">{dict.requests.noRequestsDesc}</p>
                      <Link href={`/${locale}/discover`}>
                        <Button className="h-11 px-8 rounded-full shadow-sm">{dict.requests.createRequest}</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {requests.map((request) => (
                    <Card key={request.id} className="overflow-hidden group hover:shadow-md transition-all duration-200 border-border/60">
                      <CardHeader className="bg-muted/20 border-b border-border pb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-2xl font-black tracking-hero text-gray-900">{request.animalName || dict.requests.animalUnknown}</CardTitle>
                            <CardDescription className="font-mono text-xs mt-1 tabular-nums">{dict.requests.requestId}: {request.id.slice(0, 8)}</CardDescription>
                          </div>
                          {getRequestStatusBadge(request.status, dict)}
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="p-4 space-y-3">
                          <div className="flex items-start gap-3 text-sm text-foreground">
                            <Stethoscope className="w-4 h-4 text-foreground mt-0.5" />
                            <span className="font-normal">{request.kind === "SOS" ? dict.requests.emergency : dict.requests.routine}</span>
                          </div>
                          <div className="flex items-start gap-3 text-sm text-foreground">
                            <Clock className="w-4 h-4 text-foreground mt-0.5" />
                            <span>{new Date(request.createdAt).toLocaleDateString(locale)}</span>
                          </div>
                          <div className="flex items-start gap-3 text-sm text-foreground">
                            <MapPin className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{request.locationDescription || request.locationSource}</span>
                          </div>
                        </div>

                        <div className="p-4 pt-0 mt-2 flex items-center justify-between">
                          <div className="text-xs px-2 py-1 bg-muted rounded-md text-kicker">
                            {request.serviceCode}
                          </div>
                          <Link href={`/${locale}/cattle/${request.animalId}`}>
                            <Button variant="ghost" size="sm" className="h-9 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              {dict.requests.viewDetails}
                              <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
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
        </div>
      </div>
    </PageShell>
  );
}
