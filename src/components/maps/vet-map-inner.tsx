"use client";

/**
 * VetMapInner — the actual Leaflet/react-leaflet implementation.
 * This file is ONLY ever loaded client-side via dynamic import with ssr:false.
 * Do NOT import this file directly from Server Components.
 */

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import type { NearbyVet } from "@/lib/geo";

// Fix Leaflet default icon paths broken by Webpack bundling
// (markers rely on leaflet's own CSS url() refs which get mangled)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ─── Custom SVG Icon Factories ───────────────────────────────────────────────

function makeSvgIcon(color: string, borderColor: string): L.DivIcon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 26 14 26S28 23.333 28 14C28 6.268 21.732 0 14 0z"
        fill="${color}" stroke="${borderColor}" stroke-width="2"/>
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -44],
    className: "",
  });
}

const vetIcon = makeSvgIcon("#22c55e", "#15803d");       // green-500
const paravetIcon = makeSvgIcon("#f97316", "#c2410c");   // orange-500

// ─── Auto-fit bounds helper ──────────────────────────────────────────────────

function FitBounds({
  farmerLat,
  farmerLng,
  vets,
}: {
  farmerLat: number;
  farmerLng: number;
  vets: NearbyVet[];
}) {
  const map = useMap();
  useEffect(() => {
    const pts: [number, number][] = [[farmerLat, farmerLng]];
    vets.forEach((v) => pts.push([v.latitude, v.longitude]));
    if (pts.length > 1) {
      map.fitBounds(pts, { padding: [40, 40], maxZoom: 13 });
    } else {
      map.setView([farmerLat, farmerLng], 12);
    }
  }, [map, farmerLat, farmerLng, vets]);
  return null;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface VetMapInnerProps {
  farmerLat: number;
  farmerLng: number;
  vets: NearbyVet[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function VetMapInner({
  farmerLat,
  farmerLng,
  vets,
}: VetMapInnerProps) {
  return (
    <MapContainer
      center={[farmerLat, farmerLng]}
      zoom={12}
      className="h-full w-full rounded-xl"
      scrollWheelZoom={false}
    >
      {/* Free OpenStreetMap tiles — zero API cost */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Auto-fit bounds to show all markers */}
      <FitBounds farmerLat={farmerLat} farmerLng={farmerLng} vets={vets} />

      {/* Farmer — blue pulsing circle */}
      <Circle
        center={[farmerLat, farmerLng]}
        radius={300}
        pathOptions={{
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.35,
          weight: 2,
        }}
      />
      <Circle
        center={[farmerLat, farmerLng]}
        radius={80}
        pathOptions={{
          color: "#1d4ed8",
          fillColor: "#2563eb",
          fillOpacity: 0.85,
          weight: 2,
        }}
      >
        <Popup>
          <strong>📍 Your Location</strong>
        </Popup>
      </Circle>

      {/* Vet markers */}
      {vets.map((vet) => (
        <Marker
          key={vet.userId}
          position={[vet.latitude, vet.longitude]}
          icon={vet.role === "VET_DOCTOR" ? vetIcon : paravetIcon}
        >
          <Popup maxWidth={240}>
            <div className="space-y-1 py-1">
              {/* Name & Role */}
              <p className="font-bold text-sm leading-tight">{vet.name}</p>
              <p className="text-xs text-gray-500">{vet.qualification}</p>
              {vet.clinicName && (
                <p className="text-xs text-gray-600 italic">{vet.clinicName}</p>
              )}

              {/* Distance & fee */}
              <div className="mt-2 space-y-0.5">
                <p className="text-xs">
                  📍 <strong>{vet.distanceKm} km</strong> away
                </p>
                <p className="text-xs">
                  💰 Est. visit:{" "}
                  <strong className="text-green-700">
                    ₹{vet.estimatedTotalFee}
                  </strong>
                </p>
              </div>

              {/* Call button */}
              <a
                href={`tel:+91${vet.phone}`}
                className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500"
              >
                📞 Call Now
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
