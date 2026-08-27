"use client";

/**
 * VetMap — public-facing wrapper that dynamically loads the Leaflet
 * implementation with `ssr: false`, preventing `window is not defined` errors
 * during Next.js server-side rendering.
 *
 * Per Next.js docs: `ssr: false` must be inside a Client Component.
 * This wrapper IS the Client Component; the dynamic() call is at module level.
 */

import dynamic from "next/dynamic";
import type { NearbyVet } from "@/lib/geo";

// Must be at module top-level for Next.js bundler to recognize it
const VetMapInner = dynamic(() => import("./vet-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-900 border border-slate-800">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="text-xs text-slate-400">Loading map...</p>
      </div>
    </div>
  ),
});

interface VetMapProps {
  farmerLat: number;
  farmerLng: number;
  vets: NearbyVet[];
  className?: string;
}

export function VetMap({ farmerLat, farmerLng, vets, className = "" }: VetMapProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      {/* Leaflet CSS — must be in the client bundle */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <VetMapInner
        farmerLat={farmerLat}
        farmerLng={farmerLng}
        vets={vets}
      />
    </div>
  );
}
