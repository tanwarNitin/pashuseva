import { redirect } from "next/navigation";
import { Shield, Activity, Phone } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCattleRecordsByFarmer } from "@/actions/cattle-actions";
import { CattleCard } from "@/components/cattle/cattle-card";
import { AddCattleDialog } from "@/components/cattle/add-cattle-dialog";

export default async function FarmerCattlePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "FARMER") {
    redirect("/login");
  }

  const cattleRecords = await getCattleRecordsByFarmer();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-400" />
              Pashu Swasthya Patra
            </h1>
            <p className="text-xs text-slate-400">
              Digital Health Passport
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors">
              Home
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-4 py-6 pb-24">
        
        {/* Stats & Actions */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-300">My Cattle</p>
            <p className="text-xs text-slate-500">{cattleRecords.length} registered</p>
          </div>
          <AddCattleDialog />
        </div>

        {/* Empty State */}
        {cattleRecords.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 py-12 text-center">
            <Activity className="mx-auto mb-3 h-12 w-12 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-300">No Cattle Registered</h3>
            <p className="mt-1 text-xs text-slate-500 px-6 mb-4">
              Create a digital health passport to track vaccinations, milk yield, and medical history.
            </p>
          </div>
        )}

        {/* Cattle List */}
        <div className="space-y-4">
          {cattleRecords.map(cattle => (
            <CattleCard key={cattle.id} cattle={cattle as any} />
          ))}
        </div>

        {/* Help Banner */}
        {cattleRecords.length > 0 && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 flex gap-4 items-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
              <Phone className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-300">Need help updating records?</p>
              <p className="text-xs text-blue-400/80 mt-0.5 mb-2">
                Your registered Vet or Paravet (Gopal Mitra) can add vaccinations and treatments to this passport during visits.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
