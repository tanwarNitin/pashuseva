"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Loader2,
  Stethoscope,
  IndianRupee,
  Building2,
  GraduationCap,
  Navigation,
} from "lucide-react";
import { updateVetProfile } from "@/actions/vet-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function VetRegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [coords, setCoords] = useState<{ lat: string; lng: string }>({
    lat: "",
    lng: "",
  });
  const [address, setAddress] = useState("");

  // ── Detect GPS Location ─────────────────────────────────────────────────

  function handleDetectLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
        });
        setLocationDetected(true);
        setLocationLoading(false);
      },
      (geoError) => {
        setLocationLoading(false);
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            setError("Location permission denied. Please allow access.");
            break;
          case geoError.POSITION_UNAVAILABLE:
            setError("Location information unavailable.");
            break;
          case geoError.TIMEOUT:
            setError("Location request timed out.");
            break;
          default:
            setError("Unable to detect location.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  // ── Form Submit ─────────────────────────────────────────────────────────

  function handleSubmit(formData: FormData) {
    setError(null);

    // Inject coordinates
    formData.set("latitude", coords.lat);
    formData.set("longitude", coords.lng);

    startTransition(async () => {
      const result = await updateVetProfile(formData);
      if (!result.success) {
        setError(result.error ?? "Registration failed");
      } else {
        router.push("/vet/dashboard");
      }
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20">
            <Stethoscope className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Complete Your Profile
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Set up your vet credentials and clinic details
          </p>
        </div>

        {/* ── Error Banner ────────────────────────────────────────────── */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ── Form ────────────────────────────────────────────────────── */}
        <form action={handleSubmit} className="space-y-5">
          {/* Qualifications Section */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white text-sm">
                <GraduationCap className="h-4 w-4 text-blue-400" />
                Qualifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qualification" className="text-slate-300">
                  Qualification *
                </Label>
                <select
                  id="qualification"
                  name="qualification"
                  required
                  className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800/50 px-3 text-sm text-slate-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                >
                  <option value="">Select qualification</option>
                  <option value="BVSc & AH">BVSc &amp; AH</option>
                  <option value="MVSc (Surgery)">MVSc (Surgery)</option>
                  <option value="MVSc (Medicine)">MVSc (Medicine)</option>
                  <option value="MVSc (Gynaecology)">
                    MVSc (Gynaecology)
                  </option>
                  <option value="Diploma in Animal Husbandry">
                    Diploma in Animal Husbandry
                  </option>
                  <option value="Certificate in Livestock Management">
                    Certificate in Livestock Management
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationNo" className="text-slate-300">
                  VCI / State Council Registration No. *
                </Label>
                <Input
                  id="registrationNo"
                  name="registrationNo"
                  placeholder="e.g. RJ-VCI-2019-4521"
                  required
                  className="border-slate-700 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experienceYears" className="text-slate-300">
                  Experience (years) *
                </Label>
                <Input
                  id="experienceYears"
                  name="experienceYears"
                  type="number"
                  min={0}
                  max={60}
                  defaultValue={1}
                  required
                  className="border-slate-700 bg-slate-800/50 text-slate-200"
                />
              </div>
            </CardContent>
          </Card>

          {/* Clinic & Location Section */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white text-sm">
                <Building2 className="h-4 w-4 text-amber-400" />
                Clinic &amp; Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinicName" className="text-slate-300">
                  Clinic Name{" "}
                  <span className="text-slate-500 text-xs">(optional)</span>
                </Label>
                <Input
                  id="clinicName"
                  name="clinicName"
                  placeholder="e.g. Sharma Pashu Chikitsalaya"
                  className="border-slate-700 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressText" className="text-slate-300">
                  Full Address *
                </Label>
                <Input
                  id="addressText"
                  name="addressText"
                  placeholder="Village/Town, District, State, PIN"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="border-slate-700 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>

              {/* GPS Detect Button */}
              <div className="space-y-2">
                <Label className="text-slate-300">GPS Coordinates *</Label>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={locationLoading}
                  className={`
                    w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed
                    px-4 py-3 text-sm font-medium transition-all
                    ${
                      locationDetected
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border-slate-700 bg-slate-800/30 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-400"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {locationLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Detecting location...
                    </>
                  ) : locationDetected ? (
                    <>
                      <Navigation className="h-4 w-4" />
                      Location Detected: {coords.lat}, {coords.lng}
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" />
                      Detect My Clinic Location
                    </>
                  )}
                </button>
              </div>

              {/* Hidden coordinate inputs */}
              <input type="hidden" name="latitude" value={coords.lat} />
              <input type="hidden" name="longitude" value={coords.lng} />
            </CardContent>
          </Card>

          {/* Pricing Section */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white text-sm">
                <IndianRupee className="h-4 w-4 text-yellow-400" />
                Pricing
              </CardTitle>
              <CardDescription>
                Set your base visit fee and per-km travel charges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="baseVisitFee" className="text-slate-300">
                    Base Fee (₹) *
                  </Label>
                  <Input
                    id="baseVisitFee"
                    name="baseVisitFee"
                    type="number"
                    min={0}
                    max={10000}
                    defaultValue={200}
                    required
                    className="border-slate-700 bg-slate-800/50 text-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="perKmFee" className="text-slate-300">
                    Per-KM Fee (₹) *
                  </Label>
                  <Input
                    id="perKmFee"
                    name="perKmFee"
                    type="number"
                    min={0}
                    max={500}
                    defaultValue={10}
                    required
                    className="border-slate-700 bg-slate-800/50 text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceRadiusKm" className="text-slate-300">
                  Service Radius (km) *
                </Label>
                <Input
                  id="serviceRadiusKm"
                  name="serviceRadiusKm"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={25}
                  required
                  className="border-slate-700 bg-slate-800/50 text-slate-200"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isPending || !locationDetected}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-base hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Profile...
              </span>
            ) : (
              "Complete Registration"
            )}
          </Button>

          {!locationDetected && (
            <p className="text-center text-xs text-slate-500">
              Please detect your clinic location before submitting
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
