"use client";

import { useTransition } from "react";
import { useTranslation } from "@/i18n/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Stethoscope, Clock, User, X } from "lucide-react";
import { cancelRoutineBookingAction } from "@/actions/routine.actions";
import { useRouter } from "next/navigation";

interface RoutineBooking {
  id: string;
  scheduledFor: Date;
  reason: string;
  status: string;
  createdAt: Date;
  providerName: string | null;
  providerPhone: string | null;
  animalName: string | null;
  animalTagId: string | null;
}

export default function RoutineClient({ bookings, locale }: { bookings: RoutineBooking[]; locale: string }) {
  const dict = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCancel = (id: string) => {
    if (confirm(dict.routine?.cancelWarning || "Are you sure you want to cancel this booking?")) {
      startTransition(async () => {
        const formData = new FormData();
        formData.append("id", id);
        await cancelRoutineBookingAction(formData);
        router.refresh();
      });
    }
  };

  function getStatusBadge(status: string) {
    switch (status) {
      case "REQUESTED": return <Badge variant="outline" className="uppercase tracking-kicker text-xs font-medium">⏳ {dict.requests.status.pending}</Badge>;
      case "CONFIRMED": return <Badge variant="default" className="uppercase tracking-kicker text-xs font-medium">✅ {dict.requests.status.accepted}</Badge>;
      case "COMPLETED": return <Badge variant="secondary" className="uppercase tracking-kicker text-xs font-medium">✅ {dict.requests.status.completed}</Badge>;
      case "CANCELLED": return <Badge variant="destructive" className="uppercase tracking-kicker text-xs font-medium">❌ {dict.requests.status.cancelled}</Badge>;
      case "DECLINED": return <Badge variant="destructive" className="uppercase tracking-kicker text-xs font-medium">❌ {dict.requests.status.declined}</Badge>;
      default: return <Badge variant="outline" className="uppercase tracking-kicker text-xs font-medium">{status}</Badge>;
    }
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">{dict.routine?.noUpcoming || "No upcoming routine visits"}</h3>
            <Button className="mt-4" onClick={() => router.push(`/${locale}/discover`)}>
              {dict.routine?.bookVisit || "Book Routine Visit"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <Card key={booking.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-black tracking-hero text-gray-900">{booking.animalName || dict.requests.animalUnknown}</CardTitle>
                <CardDescription className="font-mono text-xs mt-1 tabular-nums">{dict.requests.requestId}: {booking.id.slice(0, 8)}...</CardDescription>
              </div>
              {getStatusBadge(booking.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span className="font-normal text-gray-700">{dict.routine?.scheduledFor || "Scheduled For"}:</span>
                <span>{new Date(booking.scheduledFor).toLocaleString(locale)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span className="font-normal text-gray-700">{dict.request.provider}:</span>
                <span>{booking.providerName}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-600 md:col-span-2">
                <Stethoscope className="w-4 h-4 mt-0.5" />
                <div>
                  <span className="font-normal text-gray-700">{dict.routine?.reason || "Reason"}:</span>
                  <p className="mt-1">{booking.reason}</p>
                </div>
              </div>
            </div>

            {(booking.status === "REQUESTED" || booking.status === "CONFIRMED") && (
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => handleCancel(booking.id)}
                  disabled={isPending}
                >
                  <X className="w-4 h-4 mr-1" />
                  {dict.request.cancelRequest}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
