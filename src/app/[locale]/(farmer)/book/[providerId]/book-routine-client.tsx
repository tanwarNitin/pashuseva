"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Loader2, ArrowLeft } from "lucide-react";
import { createRoutineBookingAction } from "@/actions/routine.actions";

interface Animal {
  id: string;
  name: string | null;
  tagId: string | null;
}

interface Provider {
  id: string;
  name: string;
  qualification: string | null;
  providerType: string;
  baseVisitFeePaise: number;
}

interface BookRoutineClientProps {
  provider: Provider;
  animals: Animal[];
  locale: string;
}

export default function BookRoutineClient({ provider, animals, locale }: BookRoutineClientProps) {
  const dict = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    
    // Combine date and time to ISO string
    const date = formData.get("date") as string;
    const time = formData.get("time") as string;
    
    if (!date || !time) {
      setError(dict.errors.VALIDATION_ERROR);
      return;
    }

    const scheduledFor = new Date(`${date}T${time}:00`);
    formData.append("scheduledFor", scheduledFor.toISOString());
    formData.append("providerId", provider.id);

    startTransition(async () => {
      const result = await createRoutineBookingAction(
        { ok: false, code: "", messageKey: "" },
        formData
      );
      
      if (result.ok) {
        router.push(`/${locale}/requests`);
      } else {
        const errorMsg = result.messageKey;
        // Translate if exists, else fallback to messageKey
        setError((dict.routine as any)?.[errorMsg] || (dict.errors as any)?.[errorMsg] || errorMsg || dict.errors.INTERNAL_ERROR);
      }
    });
  }

  // Get tomorrow's date for minimum input
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Get 60 days from now for maximum input
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + 60);
  const maxDate = maxDateObj.toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <Button 
        variant="ghost" 
        onClick={() => router.back()}
        className="pl-0 hover:bg-transparent"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {dict.common.back}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-black tracking-hero text-gray-900">{dict.routine?.bookTitle || "Book Routine Visit"}</CardTitle>
          <CardDescription>
            {dict.routine?.bookSubtitle || "Schedule a non-emergency visit with"} <span className="font-medium text-primary">{provider.name}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form action={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="animalId">{dict.routine?.selectAnimal || "Select Animal"}</Label>
              {animals.length > 0 ? (
                <select
                  id="animalId"
                  name="animalId"
                  className="w-full border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="">-- {dict.routine?.selectAnimal || "Select Animal"} --</option>
                  {animals.map((animal) => (
                    <option key={animal.id} value={animal.id}>
                      {animal.name || dict.cattle.unnamed} {animal.tagId ? `(${animal.tagId})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg text-sm text-center">
                  <p className="mb-2">{dict.cattle.noAnimalsDesc}</p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.push(`/${locale}/cattle/new`)}
                  >
                    {dict.cattle.addAnimal}
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">{dict.routine?.selectDate || "Select Date"}</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date" 
                    id="date" 
                    name="date" 
                    className="pl-10" 
                    min={minDate}
                    max={maxDate}
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">{dict.routine?.selectTime || "Select Time"}</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="time" 
                    id="time" 
                    name="time" 
                    className="pl-10" 
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">{dict.routine?.reason || "Reason for Visit"}</Label>
              <Textarea 
                id="reason" 
                name="reason" 
                placeholder={dict.routine?.reasonPlaceholder || "E.g. General checkup..."} 
                required 
                minLength={3}
                rows={3}
              />
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-6 text-sm">
                <span className="text-muted-foreground">{dict.discovery.baseVisitFee || "Base Visit Fee"}</span>
                <span className="font-semibold text-2xl tracking-tight tabular-nums text-gray-900">₹{provider.baseVisitFeePaise / 100}</span>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isPending || animals.length === 0}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {dict.common.loading}
                  </>
                ) : (
                  dict.routine?.confirmBooking || "Confirm Booking"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
