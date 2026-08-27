"use client";

import { useState } from "react";
import { format, isPast, parseISO } from "date-fns";
import { 
  Syringe, 
  Stethoscope, 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  Droplets,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Assuming we get the raw records from db
export interface CattleRecordData {
  id: string;
  tagNumber: string;
  cattleType: string;
  breedName: string | null;
  ageMonths: number | null;
  isMilking: boolean | null;
  dailyMilkYieldLiters: string | null;
  vaccinationHistory: { name: string; date: string; next_due: string }[] | null;
  medicalNotes: { date: string; vet_name: string; diagnosis: string; prescription: string }[] | null;
}

interface CattleCardProps {
  cattle: CattleRecordData;
}

export function CattleCard({ cattle }: CattleCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Check if any vaccination is past due
  const vaccinations = cattle.vaccinationHistory || [];
  const isVaccinationDue = vaccinations.some(v => isPast(parseISO(v.next_due)));
  
  const vaxStatus = vaccinations.length === 0 
    ? { label: "No Records", color: "bg-slate-800 text-slate-300" }
    : isVaccinationDue 
      ? { label: "Vaccination Due", color: "bg-red-500/20 text-red-400 border-red-500/30" }
      : { label: "Up to Date", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };

  // Combine and sort history
  const history = [
    ...(cattle.vaccinationHistory || []).map(v => ({
      type: "vax" as const,
      date: v.date,
      title: `Vaccination: ${v.name}`,
      subtitle: `Next due: ${format(parseISO(v.next_due), "MMM d, yyyy")}`,
      icon: <Syringe className="h-4 w-4 text-emerald-400" />,
      bg: "bg-emerald-500/20"
    })),
    ...(cattle.medicalNotes || []).map(m => ({
      type: "med" as const,
      date: m.date,
      title: m.diagnosis,
      subtitle: `Dr. ${m.vet_name}`,
      details: m.prescription,
      icon: <Stethoscope className="h-4 w-4 text-blue-400" />,
      bg: "bg-blue-500/20"
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card className="overflow-hidden border border-slate-800 bg-slate-900/60 transition-all hover:border-slate-700">
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{cattle.cattleType === 'COW' ? '🐄' : cattle.cattleType === 'BUFFALO' ? '🐃' : cattle.cattleType === 'GOAT' ? '🐐' : cattle.cattleType === 'SHEEP' ? '🐑' : '🐾'}</span>
              <CardTitle className="text-lg text-white font-bold">{cattle.tagNumber}</CardTitle>
            </div>
            <CardDescription className="mt-1 text-slate-400">
              {cattle.breedName || cattle.cattleType} {cattle.ageMonths ? `· ${cattle.ageMonths} months` : ''}
            </CardDescription>
          </div>
          <Badge variant="outline" className={`border ${vaxStatus.color}`}>
            {vaxStatus.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 pb-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {cattle.isMilking && (
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30">
              <Droplets className="mr-1 h-3 w-3" />
              {cattle.dailyMilkYieldLiters} L/day
            </Badge>
          )}
          <Badge variant="secondary" className="bg-slate-800 text-slate-300 hover:bg-slate-700">
            <Activity className="mr-1 h-3 w-3" />
            Health Passport Active
          </Badge>
        </div>

        <button 
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <span>Medical History ({history.length})</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">
            {history.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-4">No medical records found.</p>
            ) : (
              <div className="relative border-l-2 border-slate-800 ml-3 pl-5 space-y-6">
                {history.map((item, idx) => (
                  <div key={idx} className="relative">
                    {/* Timeline dot */}
                    <div className={`absolute -left-[27px] top-1 h-6 w-6 rounded-full border-2 border-slate-900 ${item.bg} flex items-center justify-center`}>
                      {item.icon}
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-200">{item.title}</h4>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(item.date), "MMM d, yy")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{item.subtitle}</p>
                      {item.type === 'med' && item.details && (
                        <div className="mt-1 rounded-md bg-slate-800 p-2 text-xs text-slate-300 italic">
                          Rx: {item.details}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
