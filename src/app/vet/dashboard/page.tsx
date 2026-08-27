import { redirect } from "next/navigation";
import {
  Phone,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Radio,
  IndianRupee,
  Shield,
  Award,
  Stethoscope,
  Activity,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getVetProfile,
  getVetDashboardStats,
  getIncomingEmergencyFeed,
} from "@/actions/vet-actions";
import { DutyToggle } from "@/components/vet/duty-toggle";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ─── Emergency type labels ──────────────────────────────────────────────────

const emergencyTypeLabels: Record<string, { label: string; icon: string }> = {
  DYSTOCIA: { label: "Calving Emergency", icon: "🐄" },
  BLOAT: { label: "Bloat / Tympany", icon: "🫁" },
  HIGH_FEVER: { label: "High Fever", icon: "🌡️" },
  PROLAPSE: { label: "Prolapse", icon: "🚨" },
  FRACTURE_INJURY: { label: "Fracture / Injury", icon: "🦴" },
  GENERAL_CHECKUP: { label: "General Checkup", icon: "🩺" },
};

const cattleTypeLabels: Record<string, string> = {
  COW: "🐄 Cow",
  BUFFALO: "🐃 Buffalo",
  GOAT: "🐐 Goat",
  SHEEP: "🐑 Sheep",
  OTHER: "🐾 Other",
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function VetDashboardPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "VET_DOCTOR" && user.role !== "PARAVET_WORKER")) {
    redirect("/login");
  }

  const profile = await getVetProfile();
  const stats = await getVetDashboardStats();
  const emergencyFeed = await getIncomingEmergencyFeed();

  // If no profile yet, redirect to registration
  if (!profile) {
    redirect("/vet/register");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              PashuSeva
            </h1>
            <p className="text-xs text-slate-400">
              Welcome, {user.name}
            </p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition-colors"
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-5 px-4 py-5 pb-20">
        {/* ── Duty Toggle ──────────────────────────────────────────────── */}
        <DutyToggle initialIsOnDuty={profile.isOnDuty} />

        {/* ── Quick Stats ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Phone className="h-4 w-4 text-blue-400" />}
            label="Calls Received"
            value={String(stats?.callsReceived ?? 0)}
            accentColor="blue"
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            label="Completed"
            value={String(stats?.completedVisits ?? 0)}
            accentColor="emerald"
          />
          <StatCard
            icon={<Radio className="h-4 w-4 text-amber-400" />}
            label="Active Radius"
            value={`${stats?.activeRadius ?? profile.serviceRadiusKm} km`}
            accentColor="amber"
          />
        </div>

        {/* ── Credential Badge ─────────────────────────────────────────── */}
        <CredentialBadge
          role={user.role}
          qualification={profile.qualification}
          registrationNo={profile.registrationNo}
          isVerified={profile.isVerified}
          experienceYears={profile.experienceYears}
          clinicName={profile.clinicName}
        />

        {/* ── Live Emergency SOS Feed ──────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="relative">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              {emergencyFeed.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-white">
              Emergency SOS Feed
            </h2>
            {emergencyFeed.length > 0 && (
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                {emergencyFeed.length} active
              </Badge>
            )}
          </div>

          {emergencyFeed.length === 0 ? (
            <Card className="border-slate-800 bg-slate-900/50">
              <CardContent className="py-10 text-center">
                <Activity className="mx-auto mb-3 h-10 w-10 text-slate-600" />
                <p className="text-sm text-slate-400">
                  No active emergency requests in your area
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  New SOS alerts will appear here automatically
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {emergencyFeed.map((emergency) => (
                <EmergencyAlertCard key={emergency.id} emergency={emergency} />
              ))}
            </div>
          )}
        </section>

        {/* ── Fee Management ───────────────────────────────────────────── */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <IndianRupee className="h-4 w-4 text-amber-400" />
              Fee Management
            </CardTitle>
            <CardDescription>Your current visit pricing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-slate-800/50 p-4 text-center">
                <p className="text-xs text-slate-400 mb-1">Base Visit Fee</p>
                <p className="text-2xl font-bold text-amber-400">
                  ₹{profile.baseVisitFee}
                </p>
              </div>
              <div className="rounded-xl bg-slate-800/50 p-4 text-center">
                <p className="text-xs text-slate-400 mb-1">Per-KM Travel</p>
                <p className="text-2xl font-bold text-amber-400">
                  ₹{profile.perKmFee}
                  <span className="text-sm font-normal text-slate-500">
                    /km
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-slate-800/30 px-3 py-2 text-center">
              <p className="text-xs text-slate-500">
                Example: 10 km visit = ₹{profile.baseVisitFee} + (10 × ₹
                {profile.perKmFee}) ={" "}
                <span className="font-semibold text-white">
                  ₹{profile.baseVisitFee + 10 * profile.perKmFee}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accentColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accentColor: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-center">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/80">
        {icon}
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-slate-400 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

function CredentialBadge({
  role,
  qualification,
  registrationNo,
  isVerified,
  experienceYears,
  clinicName,
}: {
  role: string;
  qualification: string;
  registrationNo: string;
  isVerified: boolean;
  experienceYears: number;
  clinicName: string | null;
}) {
  const isVetDoctor = role === "VET_DOCTOR";

  return (
    <Card
      className={`
        border-2 overflow-hidden
        ${
          isVetDoctor
            ? "border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-blue-950/40"
            : "border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-green-950/40"
        }
      `}
    >
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`
              flex h-12 w-12 shrink-0 items-center justify-center rounded-xl
              ${
                isVetDoctor
                  ? "bg-gradient-to-br from-amber-500/20 to-blue-500/20"
                  : "bg-gradient-to-br from-emerald-500/20 to-green-500/20"
              }
            `}
          >
            {isVetDoctor ? (
              <Stethoscope
                className={`h-6 w-6 ${
                  isVetDoctor ? "text-amber-400" : "text-emerald-400"
                }`}
              />
            ) : (
              <Award className="h-6 w-6 text-emerald-400" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={`text-sm font-bold ${
                  isVetDoctor ? "text-amber-300" : "text-emerald-300"
                }`}
              >
                {isVetDoctor
                  ? "Verified Veterinary Doctor"
                  : "Certified Paravet Worker (Gopal Mitra)"}
              </h3>
              {isVerified && (
                <Badge
                  className={`text-[10px] h-4 ${
                    isVetDoctor
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  }`}
                >
                  <Shield className="h-2.5 w-2.5 mr-0.5" />
                  Verified
                </Badge>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-400">{qualification}</p>

            <Separator className="my-2 bg-white/5" />

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <div>
                <span className="text-slate-500">Reg No: </span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {registrationNo}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Exp: </span>
                <span className="text-slate-300">
                  {experienceYears} {experienceYears === 1 ? "year" : "years"}
                </span>
              </div>
              {clinicName && (
                <div className="col-span-2">
                  <span className="text-slate-500">Clinic: </span>
                  <span className="text-slate-300">{clinicName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmergencyAlertCard({
  emergency,
}: {
  emergency: {
    id: string;
    farmerName: string;
    farmerPhone: string;
    cattleType: string;
    emergencyType: string;
    urgency: string;
    description: string | null;
    farmerLatitude: number;
    farmerLongitude: number;
    farmerAddress: string | null;
    distanceKm: number;
    timeElapsed: string;
  };
}) {
  const isSOS = emergency.urgency === "EMERGENCY_SOS";
  const emergencyInfo = emergencyTypeLabels[emergency.emergencyType] ?? {
    label: emergency.emergencyType,
    icon: "⚠️",
  };
  const cattleLabel =
    cattleTypeLabels[emergency.cattleType] ?? emergency.cattleType;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${emergency.farmerLatitude},${emergency.farmerLongitude}`;

  return (
    <Card
      className={`
        border-2 overflow-hidden transition-all
        ${
          isSOS
            ? "border-red-500/40 bg-gradient-to-br from-red-950/60 via-red-900/20 to-slate-900/80 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
            : "border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-slate-900/60 to-slate-900/80"
        }
      `}
    >
      {/* SOS Header strip */}
      {isSOS && (
        <div className="flex items-center gap-2 bg-red-500/15 px-4 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="text-xs font-bold text-red-400 uppercase tracking-widest">
            Emergency SOS
          </span>
        </div>
      )}

      <CardContent className={isSOS ? "pt-3" : "pt-5"}>
        {/* Emergency type + cattle */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-base font-bold text-white">
              {emergencyInfo.icon} {emergencyInfo.label}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{cattleLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {emergency.timeElapsed}
            </p>
          </div>
        </div>

        {/* Description */}
        {emergency.description && (
          <p className="text-xs text-slate-400 mb-3 bg-slate-800/40 rounded-lg px-3 py-2 italic">
            &ldquo;{emergency.description}&rdquo;
          </p>
        )}

        {/* Farmer info row */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <div>
            <p className="text-slate-300 font-medium">
              {emergency.farmerName}
            </p>
            {emergency.farmerAddress && (
              <p className="text-slate-500 mt-0.5 truncate max-w-[200px]">
                {emergency.farmerAddress}
              </p>
            )}
          </div>
          <Badge className="bg-slate-800 text-slate-300 border-slate-700">
            <MapPin className="h-3 w-3 mr-0.5" />
            {emergency.distanceKm} km
          </Badge>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`tel:${emergency.farmerPhone}`}
            className={`
              flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold
              transition-all active:scale-95
              ${
                isSOS
                  ? "bg-red-500 text-white hover:bg-red-400 shadow-lg shadow-red-500/20"
                  : "bg-blue-500 text-white hover:bg-blue-400 shadow-lg shadow-blue-500/20"
              }
            `}
          >
            <Phone className="h-4 w-4" />
            Call Farmer
          </a>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-all active:scale-95"
          >
            <MapPin className="h-4 w-4" />
            Directions
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
