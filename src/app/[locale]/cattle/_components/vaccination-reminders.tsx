"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertCircle, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { dismissVaccinationReminder } from "@/actions/cattle.actions";
import { useRouter } from "next/navigation";

interface Reminder {
  id: string;
  animalId: string;
  animalName: string;
  tagId: string | null;
  vaccineName: string;
  nextDueOn: string;
  isOverdue: boolean;
}

interface VaccinationRemindersProps {
  reminders: Reminder[];
  locale: string;
  dict: any;
}

export function VaccinationReminders({ reminders, locale, dict }: VaccinationRemindersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (reminders.length === 0) {
    return null; // Don't render anything if no reminders
  }

  const handleDismiss = (id: string) => {
    startTransition(async () => {
      await dismissVaccinationReminder(id);
      router.refresh();
    });
  };

  return (
    <Card className="mb-8 border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-orange-800">
          <Bell className="h-5 w-5" />
          <CardTitle className="text-lg">{dict.cattle.reminders}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {reminders.map((reminder) => (
          <div 
            key={reminder.id}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border ${
              reminder.isOverdue 
                ? "bg-red-50 border-red-100" 
                : "bg-white border-orange-100"
            }`}
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className={`mt-0.5 sm:mt-0 p-2 rounded-full ${reminder.isOverdue ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">
                    {reminder.animalName || dict.cattle.unnamed} {reminder.tagId ? `(${reminder.tagId})` : ""}
                  </span>
                  <Badge variant={reminder.isOverdue ? "destructive" : "secondary"} className={!reminder.isOverdue ? "bg-orange-100 text-orange-800 hover:bg-orange-100 uppercase tracking-kicker text-[10px] font-medium" : "uppercase tracking-kicker text-[10px] font-medium"}>
                    {reminder.isOverdue ? `🚨 ${dict.cattle.overdue}` : `⏳ ${dict.cattle.dueSoon}`}
                  </Badge>
                </div>
                <p className="text-base text-foreground">
                  <span className="font-medium text-foreground">{reminder.vaccineName}</span> • {dict.cattle.vaccineDueOn}: {new Date(reminder.nextDueOn).toLocaleDateString(locale)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleDismiss(reminder.id)}
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground"
                title={dict.cattle.dismiss}
              >
                <X className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">{dict.cattle.dismiss}</span>
              </Button>
              <Link href={`/${locale}/cattle/${reminder.animalId}`}>
                <Button size="sm" variant="outline" className="bg-white">
                  {dict.cattle.viewDetails || "View"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
