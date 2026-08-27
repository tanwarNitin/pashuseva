"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  MapPin,
  Globe,
  Stethoscope,
  Shield,
  Phone,
  MessageCircle,
  Loader2,
  RefreshCw,
  Clock,
  IndianRupee,
  Star,
} from "lucide-react";
import dynamic from "next/dynamic";
import { SosBanner } from "@/components/farmer/sos-banner";
import { searchNearbyVetsAction, type NearbyVet } from "@/actions/farmer-actions";
import type { Language } from "@/lib/i18n";
import { translations } from "@/lib/i18n";

// VetMap loaded with ssr:false — must be at module top level
const VetMap = dynamic(
  () => import("@/components/maps/vet-map").then((m) => m.VetMap),
  { ssr: false, loading: () => <MapSkeleton /> }
);

// ─── Filter options ──────────────────────────────────────────────────────────

type FilterTab = "all" | "VET_DOCTOR" | "PARAVET_WORKER";
const FILTER_TABS: { id: FilterTab; en: string; hi: string }[] = [
  { id: "all", en: "All Available", hi: "सभी उपलब्ध" },
  { id: "VET_DOCTOR", en: "Doctors (BVSc)", hi: "डॉक्टर (BVSc)" },
  { id: "PARAVET_WORKER", en: "Paravets", hi: "पैरावेट" },
];

// ─── Homepage ────────────────────────────────────────────────────────────────

export default function FarmerHomePage() {
  const [lang, setLang] = useState<Language>("hi");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [vets, setVets] = useState<NearbyVet[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [isPending, startTransition] = useTransition();
  const T = translations[lang];

  // ── Detect GPS location ────────────────────────────────────────────────────
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        setLocationStatus("ok");
        fetchVets(c.lat, c.lng);
      },
      () => setLocationStatus("error"),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    detectLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch vets ─────────────────────────────────────────────────────────────
  function fetchVets(lat: number, lng: number, filter: FilterTab = "all") {
    startTransition(async () => {
      const roleFilter =
        filter === "all"
          ? undefined
          : (filter as "VET_DOCTOR" | "PARAVET_WORKER");
      const results = await searchNearbyVetsAction(lat, lng, 25, roleFilter);
      setVets(results);
    });
  }

  function handleFilterChange(tab: FilterTab) {
    setActiveFilter(tab);
    if (coords) fetchVets(coords.lat, coords.lng, tab);
  }

  // Filtered vets (client-side too, in case server filter not applied)
  const filteredVets =
    activeFilter === "all"
      ? vets
      : vets.filter((v) => v.role === activeFilter);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
              <span className="text-sm">🐄</span>
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white leading-none">
                {T.app_name}
              </h1>
              <p className="text-[10px] text-emerald-400 leading-none">
                {T.app_tagline}
              </p>
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-2">
            {/* GPS status */}
            <div className="flex items-center gap-1.5">
              {locationStatus === "loading" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
              )}
              {locationStatus === "ok" && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
              )}
              {locationStatus === "error" && (
                <MapPin className="h-3.5 w-3.5 text-red-400" />
              )}
              <span className="text-[10px] text-slate-400">
                {locationStatus === "ok"
                  ? "GPS"
                  : locationStatus === "loading"
                  ? T.detecting_location
                  : T.location_error}
              </span>
            </div>

            {/* Language toggle */}
            <button
              onClick={() => setLang((l) => (l === "hi" ? "en" : "hi"))}
              className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              {lang === "hi" ? "EN" : "हिं"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-5 px-4 py-5 pb-24">
        {/* ── SOS Banner ──────────────────────────────────────────────── */}
        <SosBanner
          lang={lang}
          farmerLat={coords?.lat ?? null}
          farmerLng={coords?.lng ?? null}
        />

        {/* ── Leaflet Map ─────────────────────────────────────────────── */}
        {coords ? (
          <div className="relative z-0 h-64 w-full rounded-xl overflow-hidden border border-slate-800 shadow-lg">
            <VetMap
              farmerLat={coords.lat}
              farmerLng={coords.lng}
              vets={filteredVets}
              className="h-full"
            />
          </div>
        ) : (
          <MapSkeleton />
        )}

        {/* ── Nearby Doctor Directory ──────────────────────────────────── */}
        <section>
          {/* Section header */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-emerald-400" />
              {T.nearby_doctors}
              {filteredVets.length > 0 && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  {filteredVets.length}
                </span>
              )}
            </h2>
            {coords && (
              <button
                onClick={() => fetchVets(coords.lat, coords.lng, activeFilter)}
                disabled={isPending}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
                />
                {T.try_again}
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="mb-4 flex gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleFilterChange(tab.id)}
                className={`
                  flex-1 rounded-lg py-2 text-xs font-medium transition-all
                  ${
                    activeFilter === tab.id
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                  }
                `}
              >
                {tab[lang]}
              </button>
            ))}
          </div>

          {/* Loading skeleton */}
          {isPending && vets.length === 0 && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-xl bg-slate-800/60"
                />
              ))}
            </div>
          )}

          {/* No location error */}
          {!coords && locationStatus === "error" && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 text-center">
              <MapPin className="mx-auto mb-2 h-8 w-8 text-amber-400" />
              <p className="text-sm text-amber-300">{T.allow_location}</p>
              <button
                onClick={detectLocation}
                className="mt-3 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-black hover:bg-amber-400 transition-colors"
              >
                {T.detecting_location}
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isPending && coords && filteredVets.length === 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 py-10 text-center">
              <Stethoscope className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm text-slate-400">{T.no_vets_found}</p>
              <p className="mt-1 text-xs text-slate-500">{T.try_larger_radius}</p>
            </div>
          )}

          {/* Doctor cards */}
          {!isPending && filteredVets.length > 0 && (
            <div className="space-y-3">
              {filteredVets.map((vet) => (
                <DoctorCard
                  key={vet.userId}
                  vet={vet}
                  lang={lang}
                  farmerLat={coords!.lat}
                  farmerLng={coords!.lng}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ─── Doctor Card ─────────────────────────────────────────────────────────────

function DoctorCard({
  vet,
  lang,
  farmerLat,
  farmerLng,
}: {
  vet: NearbyVet;
  lang: Language;
  farmerLat: number;
  farmerLng: number;
}) {
  const hi = lang === "hi";
  const travelFee = Math.round(vet.distanceKm * vet.perKmFee);
  const arrivalMin = Math.round((vet.distanceKm / 40) * 60);
  const arrivalMax = arrivalMin + 10;

  const waText = encodeURIComponent(
    `🐄 PashuSeva — Vet Request\nDoctor: ${vet.name}\nLocation: https://maps.google.com/?q=${farmerLat},${farmerLng}`
  );

  return (
    <article className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 transition-all hover:border-slate-700">
      {/* Card header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        {/* Avatar */}
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold
            ${vet.role === "VET_DOCTOR"
              ? "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400"
              : "bg-gradient-to-br from-orange-500/20 to-amber-500/20 text-orange-400"
            }`}
        >
          {vet.role === "VET_DOCTOR" ? "🩺" : "💉"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-white truncate">{vet.name}</h3>
            {vet.isVerified && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
                <Shield className="h-2.5 w-2.5" />
                {hi ? "सत्यापित" : "Verified"}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate">{vet.qualification}</p>
          {vet.clinicName && (
            <p className="text-[11px] text-slate-500 truncate">{vet.clinicName}</p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {/* Experience */}
            <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
              <Star className="h-3 w-3" />
              {vet.experienceYears} {hi ? "वर्ष" : "yrs"}
            </span>
            {/* Distance */}
            <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-semibold">
              <MapPin className="h-3 w-3" />
              📍 {vet.distanceKm} {hi ? "किमी दूर" : "km away"}
              {" "}
              <span className="text-slate-500 font-normal">
                (Est. {arrivalMin}–{arrivalMax} min)
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Fee breakdown */}
      <div className="mx-4 mb-3 rounded-lg bg-slate-800/50 px-3 py-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">
            <IndianRupee className="inline h-3 w-3" />{" "}
            {hi ? "अनुमानित विज़िट" : "Est. Visit"}
          </span>
          <span className="font-bold text-amber-400">
            ₹{vet.estimatedTotalFee}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-slate-500">
          {hi ? "बेस" : "Base"}: ₹{vet.baseVisitFee} +{" "}
          {hi ? "यात्रा" : "Travel"}: ₹{travelFee}
        </p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-0 border-t border-slate-800">
        <a
          id={`call-btn-${vet.userId}`}
          href={`tel:+91${vet.phone}`}
          className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors border-r border-slate-800"
        >
          <Phone className="h-4 w-4" />
          {hi ? "कॉल करें" : "Call Doctor"}
        </a>
        <a
          id={`whatsapp-btn-${vet.userId}`}
          href={`https://wa.me/91${vet.phone}?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-[#25d366] hover:bg-[#25d366]/10 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
      </div>
    </article>
  );
}

// ─── Map Skeleton ─────────────────────────────────────────────────────────────

function MapSkeleton() {
  return (
    <div className="h-64 w-full animate-pulse rounded-xl bg-slate-800/60 border border-slate-800 flex items-center justify-center">
      <div className="text-center">
        <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-600" />
        <p className="text-xs text-slate-500">Loading map...</p>
      </div>
    </div>
  );
}
