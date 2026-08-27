"use client";

import { useState, useTransition, useCallback } from "react";
import { AlertTriangle, X, Loader2, MapPin, Phone, MessageCircle } from "lucide-react";
import {
  searchNearbyVetsAction,
  createEmergencyRequestAction,
  type NearbyVet,
} from "@/actions/farmer-actions";
import type { Language } from "@/lib/i18n";

// ─── Data constants ──────────────────────────────────────────────────────────

const CATTLE_OPTIONS = [
  { value: "COW", emoji: "🐄", en: "Cow", hi: "गाय" },
  { value: "BUFFALO", emoji: "🐃", en: "Buffalo", hi: "भैंस" },
  { value: "GOAT", emoji: "🐐", en: "Goat / Sheep", hi: "बकरी / भेड़" },
  { value: "OTHER", emoji: "🐾", en: "Other", hi: "अन्य" },
] as const;

const SYMPTOM_OPTIONS = [
  {
    value: "DYSTOCIA",
    emoji: "🤰",
    en: "Calving Difficulty",
    hi: "बच्चा फंसना",
    severity: "critical",
  },
  {
    value: "BLOAT",
    emoji: "🫁",
    en: "Severe Bloat",
    hi: "अफरा",
    severity: "critical",
  },
  {
    value: "HIGH_FEVER",
    emoji: "🌡️",
    en: "High Fever",
    hi: "तेज बुखार",
    severity: "high",
  },
  {
    value: "PROLAPSE",
    emoji: "🚨",
    en: "Prolapse",
    hi: "फूल / पांछा दिखाना",
    severity: "critical",
  },
  {
    value: "FRACTURE_INJURY",
    emoji: "🦴",
    en: "Serious Injury",
    hi: "गंभीर चोट",
    severity: "high",
  },
] as const;

type CattleValue = (typeof CATTLE_OPTIONS)[number]["value"];
type SymptomValue = (typeof SYMPTOM_OPTIONS)[number]["value"];

interface SosBannerProps {
  lang: Language;
  farmerLat: number | null;
  farmerLng: number | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SosBanner({ lang, farmerLat, farmerLng }: SosBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<"select" | "results">("select");
  const [selectedCattle, setSelectedCattle] = useState<CattleValue | null>(null);
  const [selectedSymptom, setSelectedSymptom] = useState<SymptomValue | null>(null);
  const [nearbyVets, setNearbyVets] = useState<NearbyVet[]>([]);
  const [isPending, startTransition] = useTransition();
  const [requestSent, setRequestSent] = useState(false);
  const [locationErr, setLocationErr] = useState(false);

  const hi = lang === "hi";

  const handleOpen = useCallback(() => {
    if (!farmerLat || !farmerLng) {
      setLocationErr(true);
      return;
    }
    setLocationErr(false);
    setStep("select");
    setSelectedCattle(null);
    setSelectedSymptom(null);
    setRequestSent(false);
    setNearbyVets([]);
    setModalOpen(true);
  }, [farmerLat, farmerLng]);

  const handleDispatch = useCallback(() => {
    if (!selectedCattle || !selectedSymptom || !farmerLat || !farmerLng) return;

    startTransition(async () => {
      // 1. Find nearest 3 on-duty vets
      const vets = await searchNearbyVetsAction(farmerLat, farmerLng, 25);
      setNearbyVets(vets.slice(0, 3));

      // 2. Persist the emergency request
      const fd = new FormData();
      fd.set("cattleType", selectedCattle);
      fd.set("urgency", "EMERGENCY_SOS");
      fd.set("emergencyType", selectedSymptom);
      fd.set("farmerLatitude", String(farmerLat));
      fd.set("farmerLongitude", String(farmerLng));
      await createEmergencyRequestAction(fd);

      setRequestSent(true);
      setStep("results");
    });
  }, [selectedCattle, selectedSymptom, farmerLat, farmerLng]);

  const cattleLabel =
    CATTLE_OPTIONS.find((c) => c.value === selectedCattle)?.[hi ? "hi" : "en"] ?? "";
  const symptomLabel =
    SYMPTOM_OPTIONS.find((s) => s.value === selectedSymptom)?.[hi ? "hi" : "en"] ?? "";

  return (
    <>
      {/* ── SOS Banner Button ─────────────────────────────────────────── */}
      <button
        id="sos-trigger-btn"
        onClick={handleOpen}
        className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 via-red-500 to-orange-500 p-5 text-white shadow-2xl shadow-red-500/30 active:scale-[0.98] transition-transform"
      >
        {/* Background pulse */}
        <div className="absolute inset-0 bg-red-400/20 animate-pulse" />

        <div className="relative flex items-center gap-4">
          {/* SOS icon with ring */}
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <AlertTriangle className="h-9 w-9 text-white" strokeWidth={2.5} />
            <span className="absolute -right-1 -top-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-300 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-yellow-400" />
            </span>
          </div>

          <div className="text-left flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-red-100">
              {hi ? "पशु आपातकालीन सेवा" : "Emergency Livestock SOS"}
            </p>
            <p className="text-xl font-extrabold leading-tight tracking-tight">
              {hi ? "आपातकाल SOS" : "Emergency SOS"}
            </p>
            <p className="mt-1 text-sm text-red-100">
              {hi
                ? "1 टैप में 3 नजदीकी डॉक्टर तुरंत बुलाएं"
                : "Alert 3 nearest doctors in 1 tap"}
            </p>
          </div>

          {/* Chevron */}
          <div className="text-2xl font-bold text-white/70">›</div>
        </div>

        {locationErr && (
          <p className="relative mt-3 rounded-lg bg-black/20 px-3 py-1.5 text-xs text-yellow-200">
            ⚠️{" "}
            {hi
              ? "पहले अपना स्थान चालू करें"
              : "Enable location first to use SOS"}
          </p>
        )}
      </button>

      {/* ── Modal ─────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-3xl bg-slate-950 border border-white/10 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {hi ? "आपातकाल SOS" : "Emergency SOS"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {step === "select"
                      ? hi ? "पशु और समस्या चुनें" : "Select animal & symptom"
                      : hi ? "नजदीकी डॉक्टर" : "Nearby doctors"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-6">
              {step === "select" ? (
                <>
                  {/* ── Step 1: Cattle selector ───────────────────── */}
                  <section>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                      {hi ? "पशु का प्रकार" : "Select Animal"}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {CATTLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSelectedCattle(opt.value)}
                          className={`
                            flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all
                            ${
                              selectedCattle === opt.value
                                ? "border-red-500 bg-red-500/10 text-white"
                                : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
                            }
                          `}
                        >
                          <span className="text-2xl">{opt.emoji}</span>
                          <span>{opt[hi ? "hi" : "en"]}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* ── Step 2: Symptom selector ──────────────────── */}
                  <section>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                      {hi ? "समस्या / लक्षण" : "Critical Symptom"}
                    </p>
                    <div className="space-y-2">
                      {SYMPTOM_OPTIONS.map((sym) => (
                        <button
                          key={sym.value}
                          type="button"
                          onClick={() => setSelectedSymptom(sym.value)}
                          className={`
                            w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all
                            ${
                              selectedSymptom === sym.value
                                ? "border-red-500 bg-red-500/10"
                                : "border-slate-800 bg-slate-900 hover:border-slate-700"
                            }
                          `}
                        >
                          <span className="text-2xl">{sym.emoji}</span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white">
                              {sym[hi ? "hi" : "en"]}
                            </p>
                            {!hi && (
                              <p className="text-[11px] text-slate-500">
                                {sym.hi}
                              </p>
                            )}
                          </div>
                          {sym.severity === "critical" && (
                            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 uppercase">
                              Critical
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* ── Dispatch button ───────────────────────────── */}
                  <button
                    type="button"
                    onClick={handleDispatch}
                    disabled={!selectedCattle || !selectedSymptom || isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-4 text-base font-bold text-white shadow-lg shadow-red-600/30 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {hi ? "डॉक्टर खोज रहे हैं..." : "Finding doctors..."}
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5" />
                        {hi ? "SOS भेजें — डॉक्टर बुलाएं" : "Send SOS — Get Doctors Now"}
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* ── Results: 3 nearest vets ───────────────────── */}
                  {requestSent && (
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400">
                      ✅{" "}
                      {hi
                        ? "आपका SOS भेज दिया गया है!"
                        : "SOS dispatched successfully!"}
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                      {hi ? "आपके नजदीक के डॉक्टर" : "Nearest Doctors (25 km)"}
                    </p>
                    <p className="mb-4 text-xs text-slate-500">
                      {cattleLabel && symptomLabel
                        ? `${cattleLabel} · ${symptomLabel}`
                        : ""}
                    </p>

                    {nearbyVets.length === 0 ? (
                      <div className="rounded-xl bg-slate-900 py-8 text-center">
                        <p className="text-sm text-slate-400">
                          {hi
                            ? "25 किमी में कोई डॉक्टर नहीं मिला"
                            : "No on-duty doctors found within 25 km"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {hi ? "दायरा बढ़ाकर देखें" : "Try a wider radius"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {nearbyVets.map((vet, i) => (
                          <SosVetCard
                            key={vet.userId}
                            vet={vet}
                            rank={i + 1}
                            farmerLat={farmerLat!}
                            farmerLng={farmerLng!}
                            cattleLabel={cattleLabel}
                            symptomLabel={symptomLabel}
                            hi={hi}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setStep("select")}
                    className="w-full rounded-xl border border-slate-800 py-3 text-sm font-medium text-slate-400 hover:bg-slate-900 transition-colors"
                  >
                    {hi ? "← वापस जाएं" : "← Back to selection"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── SOS Vet Card (shown after dispatch) ────────────────────────────────────

function SosVetCard({
  vet,
  rank,
  farmerLat,
  farmerLng,
  cattleLabel,
  symptomLabel,
  hi,
}: {
  vet: NearbyVet;
  rank: number;
  farmerLat: number;
  farmerLng: number;
  cattleLabel: string;
  symptomLabel: string;
  hi: boolean;
}) {
  const isFirst = rank === 1;
  const waText = encodeURIComponent(
    `🚨 URGENT PashuSeva Emergency!\nAnimal: ${cattleLabel}\nIssue: ${symptomLabel}\nLocation: https://maps.google.com/?q=${farmerLat},${farmerLng}`
  );

  return (
    <div
      className={`
        rounded-xl border-2 overflow-hidden
        ${isFirst ? "border-red-500/40 bg-red-950/30" : "border-slate-800 bg-slate-900/50"}
      `}
    >
      {isFirst && (
        <div className="bg-red-500/15 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-red-400">
          🏆 {hi ? "सबसे नजदीक" : "Nearest"}
        </div>
      )}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-white text-sm">{vet.name}</p>
            <p className="text-[11px] text-slate-400">{vet.qualification}</p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-800 rounded-lg px-2 py-1">
            {vet.distanceKm} km
          </span>
        </div>
        <p className="text-xs text-amber-400">
          ₹{vet.estimatedTotalFee}{" "}
          <span className="text-slate-500">
            (₹{vet.baseVisitFee} + ₹{Math.round(vet.distanceKm * vet.perKmFee)} travel)
          </span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`tel:+91${vet.phone}`}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors active:scale-95"
          >
            <Phone className="h-3.5 w-3.5" />
            {hi ? "कॉल करें" : "Call Now"}
          </a>
          <a
            href={`https://wa.me/91${vet.phone}?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-[#25d366] py-2.5 text-xs font-bold text-white hover:bg-[#128c7e] transition-colors active:scale-95"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
