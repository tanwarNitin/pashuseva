
"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useTranslation } from "@/i18n/client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { MapPin, Loader2, AlertCircle, Search, Crosshair, RefreshCw, AlertTriangle, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { discoverProvidersAction } from "@/actions/discovery.actions";
import type { ProviderWithDistance } from "@/types/discovery";
import { SOSCreationModal } from "@/components/farmer/sos-creation-modal";

// Dynamic import for map component to avoid SSR issues
const DiscoveryMap = dynamic(
  () => import("@/components/farmer/discovery-map").then((mod) => mod.default),
  { ssr: false, loading: () => <DiscoveryMapSkeleton /> }
);

interface DiscoveryState {
  providers: ProviderWithDistance[];
  isLoading: boolean;
  error: string | null;
  farmerLocation: { latitude: string; longitude: string } | null;
  searchParams: {
    requestType?: "SOS" | "ROUTINE";
    maxDistanceMeters?: number;
    providerType?: "VET_DOCTOR" | "PARAVET_WORKER";
    searchQuery?: string;
  };
}

function DiscoveryMapSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-2">
        <div className="h-[600px] rounded-lg border bg-card animate-pulse">
          <div className="h-full bg-gray-100 rounded-lg" />
        </div>
        <div className="mt-4 h-64 bg-white rounded-lg border animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="h-96 bg-white rounded-lg border animate-pulse" />
        <div className="h-64 bg-white rounded-lg border animate-pulse" />
      </div>
    </div>
  );
}

// Default fallback coordinate (Central Delhi / Connaught Place where demo providers are centered)
const DEFAULT_FALLBACK_LOCATION = {
  latitude: "28.6139",
  longitude: "77.2090",
};

export default function DiscoveryClient({
  farmerId,
  locale = "en",
}: {
  farmerId?: string | null;
  locale?: string;
}) {
  const dict = useTranslation();
  const router = useRouter();

  const [state, setState] = useState<DiscoveryState>({
    providers: [],
    isLoading: false,
    error: null,
    farmerLocation: null,
    searchParams: {},
  });

  const [searchInput, setSearchInput] = useState("");
  const [isPending, startTransition] = useTransition();

  // Helper to call discovery action
  const runDiscovery = useCallback(
    (formData: FormData) => {
      startTransition(async () => {
        const result = await discoverProvidersAction(formData);
        if (result.ok) {
          setState((prev) => ({
            ...prev,
            providers: result.data.providers as any[],
            isLoading: false,
            error: null,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            error: (dict.errors as any)[result.code] || dict.errors.INTERNAL_ERROR,
            isLoading: false,
          }));
        }
      });
    },
    [dict, startTransition]
  );

  // Get location with automatic default fallback
  const getCurrentLocation = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    if (!navigator.geolocation) {
      // Fallback immediately
      const location = DEFAULT_FALLBACK_LOCATION;
      setState((prev) => ({ ...prev, farmerLocation: location, isLoading: false }));
      const formData = new FormData();
      formData.append("latitude", location.latitude);
      formData.append("longitude", location.longitude);
      runDiscovery(formData);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        };

        setState((prev) => ({ ...prev, farmerLocation: location, isLoading: false }));

        const formData = new FormData();
        formData.append("latitude", location.latitude);
        formData.append("longitude", location.longitude);
        runDiscovery(formData);
      },
      (_err) => {
        // Use default fallback coordinates so providers are always discoverable
        const location = DEFAULT_FALLBACK_LOCATION;
        setState((prev) => ({
          ...prev,
          farmerLocation: location,
          isLoading: false,
          error: null,
        }));

        const formData = new FormData();
        formData.append("latitude", location.latitude);
        formData.append("longitude", location.longitude);
        runDiscovery(formData);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
    );
  }, [runDiscovery]);

  // Request location on mount
  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  const handleSearchChange = (query: string) => {
    setSearchInput(query);
    setState((prev) => ({
      ...prev,
      searchParams: { ...prev.searchParams, searchQuery: query },
    }));
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setState((prev) => ({
      ...prev,
      searchParams: { ...prev.searchParams, searchQuery: "" },
    }));
  };

  const handleRequestTypeChange = (type: "SOS" | "ROUTINE") => {
    setState((prev) => ({
      ...prev,
      searchParams: { ...prev.searchParams, requestType: type },
    }));

    if (state.farmerLocation) {
      const formData = new FormData();
      formData.append("latitude", state.farmerLocation.latitude);
      formData.append("longitude", state.farmerLocation.longitude);
      formData.append("requestType", type);
      if (state.searchParams.maxDistanceMeters) {
        formData.append("maxDistanceMeters", state.searchParams.maxDistanceMeters.toString());
      }
      if (state.searchParams.providerType) {
        formData.append("providerType", state.searchParams.providerType);
      }
      runDiscovery(formData);
    }
  };

  const handleProviderTypeChange = (type: "VET_DOCTOR" | "PARAVET_WORKER" | undefined) => {
    setState((prev) => ({
      ...prev,
      searchParams: { ...prev.searchParams, providerType: type },
    }));

    if (state.farmerLocation) {
      const formData = new FormData();
      formData.append("latitude", state.farmerLocation.latitude);
      formData.append("longitude", state.farmerLocation.longitude);
      if (type) formData.append("providerType", type);
      if (state.searchParams.requestType) {
        formData.append("requestType", state.searchParams.requestType);
      }
      if (state.searchParams.maxDistanceMeters) {
        formData.append("maxDistanceMeters", state.searchParams.maxDistanceMeters.toString());
      }
      runDiscovery(formData);
    }
  };

  const handleDistanceChange = (distance: number) => {
    setState((prev) => ({
      ...prev,
      searchParams: { ...prev.searchParams, maxDistanceMeters: distance },
    }));

    if (state.farmerLocation) {
      const formData = new FormData();
      formData.append("latitude", state.farmerLocation.latitude);
      formData.append("longitude", state.farmerLocation.longitude);
      formData.append("maxDistanceMeters", distance.toString());
      if (state.searchParams.requestType) {
        formData.append("requestType", state.searchParams.requestType);
      }
      if (state.searchParams.providerType) {
        formData.append("providerType", state.searchParams.providerType);
      }
      runDiscovery(formData);
    }
  };

  // Filter providers in memory by search query
  const query = state.searchParams.searchQuery?.trim().toLowerCase() || "";
  const filteredProviders = query
    ? state.providers.filter((p) => {
        return (
          p.name?.toLowerCase().includes(query) ||
          p.qualification?.toLowerCase().includes(query) ||
          p.specializationArea?.toLowerCase().includes(query) ||
          p.district?.toLowerCase().includes(query) ||
          p.state?.toLowerCase().includes(query) ||
          p.villageOrServiceArea?.toLowerCase().includes(query)
        );
      })
    : state.providers;

  return (
    <div className="space-y-6 relative pb-20">
      {/* Primary Search & Quick Actions Box */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="max-w-xl mx-auto">
          <label htmlFor="location-search" className="block text-sm font-semibold text-gray-700 mb-2">
            {dict.discovery.searchPlaceholder}
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              id="location-search"
              type="text"
              placeholder={dict.discovery.searchPlaceholder}
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-11 pr-10 py-3 text-base rounded-lg border-gray-300 focus:ring-2 focus:ring-primary-500"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center items-center">
          {farmerId && state.farmerLocation ? (
            <SOSCreationModal
              farmerId={farmerId}
              latitude={state.farmerLocation.latitude}
              longitude={state.farmerLocation.longitude}
              locale={locale}
              trigger={
                <Button
                  size="default"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-lg shadow-sm flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {dict.discovery.emergency}
                </Button>
              }
            />
          ) : (
            <Button
              size="default"
              onClick={() => router.push(`/${locale}/login?redirect=/${locale}/discover`)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-lg shadow-sm flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {dict.discovery.emergency}
            </Button>
          )}

          <Button
            variant="outline"
            size="default"
            onClick={() => handleRequestTypeChange("ROUTINE")}
            className="border-blue-200 text-blue-700 hover:bg-blue-50 px-5 py-2.5 rounded-lg font-medium flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            {dict.discovery.routine}
          </Button>

          <Button
            variant="outline"
            size="default"
            onClick={getCurrentLocation}
            className="border-gray-300 text-gray-700 hover:bg-gray-100 px-4 py-2.5 rounded-lg flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {dict.discovery.refresh}
          </Button>
        </div>
      </div>

      {/* Filter and Radius Controls */}
      <Card className="bg-white">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
              <MapPin className="h-4 w-4 text-primary-600" />
              <span>
                {filteredProviders.length} {dict.discovery.providersFound}
              </span>
              {query && (
                <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                  Matching "{query}"
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">{dict.discovery.radius}:</span>
                <select
                  value={state.searchParams.maxDistanceMeters || 50000}
                  onChange={(e) => handleDistanceChange(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={5000}>{dict.discovery.distance5km}</option>
                  <option value={10000}>{dict.discovery.distance10km}</option>
                  <option value={25000}>{dict.discovery.distance25km}</option>
                  <option value={50000}>{dict.discovery.distance50km}</option>
                  <option value={100000}>{dict.discovery.distance100km}</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">{dict.discovery.providerType}:</span>
                <select
                  value={state.searchParams.providerType || ""}
                  onChange={(e) =>
                    handleProviderTypeChange(
                      e.target.value as "VET_DOCTOR" | "PARAVET_WORKER" | undefined
                    )
                  }
                  className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">{dict.discovery.all}</option>
                  <option value="VET_DOCTOR">{dict.discovery.vetDoctors}</option>
                  <option value="PARAVET_WORKER">{dict.discovery.paravetWorkers}</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider List and Map */}
      {state.farmerLocation && filteredProviders.length > 0 && (
        <DiscoveryMap providers={filteredProviders} farmerLocation={state.farmerLocation} />
      )}

      {/* No Providers Empty State */}
      {state.farmerLocation && filteredProviders.length === 0 && !state.isLoading && (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center max-w-sm">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">{dict.discovery.noProvidersFound}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {query
                  ? `No providers matched "${query}". Try clearing the search or widening your radius.`
                  : dict.discovery.tryExpandingSearch}
              </p>
              {query && (
                <Button variant="outline" size="sm" onClick={handleClearSearch}>
                  {dict.discovery.clearSearch}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Floating SOS Button (Fixed in Bottom-Right Corner) */}
      <div className="fixed bottom-6 right-6 z-50">
        {farmerId && state.farmerLocation ? (
          <SOSCreationModal
            farmerId={farmerId}
            latitude={state.farmerLocation.latitude}
            longitude={state.farmerLocation.longitude}
            locale={locale}
            trigger={
              <Button
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white shadow-2xl animate-pulse h-14 px-6 text-base font-bold rounded-full flex items-center gap-2 border-2 border-white"
              >
                <AlertTriangle className="h-5 w-5" />
                {dict.discovery.emergency}
              </Button>
            }
          />
        ) : (
          <Button
            size="lg"
            onClick={() => router.push(`/${locale}/login?redirect=/${locale}/discover`)}
            className="bg-red-600 hover:bg-red-700 text-white shadow-2xl animate-pulse h-14 px-6 text-base font-bold rounded-full flex items-center gap-2 border-2 border-white"
          >
            <AlertTriangle className="h-5 w-5" />
            {dict.discovery.emergency}
          </Button>
        )}
      </div>
    </div>
  );
}