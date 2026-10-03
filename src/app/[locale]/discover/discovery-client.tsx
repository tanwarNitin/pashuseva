"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useTranslation } from "@/i18n/client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { MapPin, Loader2, Search, Crosshair, RefreshCw, AlertTriangle, Calendar, X, MapPinOff, Filter } from "lucide-react";
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
  locationStatus: "locating" | "granted" | "denied" | "unavailable" | "timeout" | null;
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
          <div className="h-full bg-muted rounded-lg" />
        </div>
        <div className="mt-4 h-64 bg-card rounded-lg border animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="h-96 bg-card rounded-lg border animate-pulse" />
        <div className="h-64 bg-card rounded-lg border animate-pulse" />
      </div>
    </div>
  );
}

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
    locationStatus: null,
    searchParams: {},
  });

  const [searchInput, setSearchInput] = useState("");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const runDiscovery = useCallback(
    (formData: FormData) => {
      startTransition(async () => {
        const result = await discoverProvidersAction(formData);
        if (result.ok) {
          setState((prev) => ({
            ...prev,
            providers: farmerId
              ? (result.data.providers as any[]).filter(
                  (p) => p.userId !== farmerId && p.id !== farmerId
                )
              : (result.data.providers as any[]),
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
    [dict]
  );

  const getCurrentLocation = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true, error: null, locationStatus: "locating" }));

    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, locationStatus: "unavailable", isLoading: false }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        };

        setState((prev) => ({ ...prev, farmerLocation: location, locationStatus: "granted", isLoading: false }));

        const formData = new FormData();
        formData.append("latitude", location.latitude);
        formData.append("longitude", location.longitude);
        if (state.searchParams.searchQuery) formData.append("searchQuery", state.searchParams.searchQuery);
        if (state.searchParams.requestType) formData.append("requestType", state.searchParams.requestType);
        if (state.searchParams.maxDistanceMeters) formData.append("maxDistanceMeters", state.searchParams.maxDistanceMeters.toString());
        if (state.searchParams.providerType) formData.append("providerType", state.searchParams.providerType);
        runDiscovery(formData);
      },
      (err) => {
        const status = err.code === 1 ? "denied" : err.code === 3 ? "timeout" : "unavailable";
        setState((prev) => ({
          ...prev,
          farmerLocation: null,
          locationStatus: status,
          isLoading: false,
          error: null,
        }));
        
        // If there is a search query, still run discovery with null location
        if (state.searchParams.searchQuery) {
          const formData = new FormData();
          formData.append("searchQuery", state.searchParams.searchQuery);
          if (state.searchParams.requestType) formData.append("requestType", state.searchParams.requestType);
          if (state.searchParams.providerType) formData.append("providerType", state.searchParams.providerType);
          runDiscovery(formData);
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
    );
  }, [runDiscovery, state.searchParams.searchQuery, state.searchParams.requestType, state.searchParams.maxDistanceMeters, state.searchParams.providerType]);

  useEffect(() => {
    // Only run on initial mount if status is null
    if (state.locationStatus === null) {
      getCurrentLocation();
    }
  }, [getCurrentLocation, state.locationStatus]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== state.searchParams.searchQuery) {
        setState((prev) => ({
          ...prev,
          searchParams: { ...prev.searchParams, searchQuery: searchInput },
          isLoading: true,
        }));

        const formData = new FormData();
        if (state.farmerLocation) {
          formData.append("latitude", state.farmerLocation.latitude);
          formData.append("longitude", state.farmerLocation.longitude);
        }
        if (searchInput) formData.append("searchQuery", searchInput);
        if (state.searchParams.requestType) formData.append("requestType", state.searchParams.requestType);
        if (state.searchParams.maxDistanceMeters && !searchInput) {
          formData.append("maxDistanceMeters", state.searchParams.maxDistanceMeters.toString());
        }
        if (state.searchParams.providerType) formData.append("providerType", state.searchParams.providerType);
        
        runDiscovery(formData);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [searchInput, state.searchParams.searchQuery, state.farmerLocation, state.searchParams.requestType, state.searchParams.maxDistanceMeters, state.searchParams.providerType, runDiscovery]);

  const handleClearSearch = () => {
    setSearchInput("");
  };

  const handleRequestTypeChange = (type: "SOS" | "ROUTINE") => {
    setState((prev) => ({
      ...prev,
      searchParams: { ...prev.searchParams, requestType: type },
      isLoading: true,
    }));

    const formData = new FormData();
    if (state.farmerLocation) {
      formData.append("latitude", state.farmerLocation.latitude);
      formData.append("longitude", state.farmerLocation.longitude);
    }
    formData.append("requestType", type);
    if (state.searchParams.searchQuery) formData.append("searchQuery", state.searchParams.searchQuery);
    if (state.searchParams.maxDistanceMeters && !state.searchParams.searchQuery) {
      formData.append("maxDistanceMeters", state.searchParams.maxDistanceMeters.toString());
    }
    if (state.searchParams.providerType) {
      formData.append("providerType", state.searchParams.providerType);
    }
    runDiscovery(formData);
  };

  const handleProviderTypeChange = (type: "VET_DOCTOR" | "PARAVET_WORKER" | undefined) => {
    setState((prev) => ({
      ...prev,
      searchParams: { ...prev.searchParams, providerType: type },
      isLoading: true,
    }));

    const formData = new FormData();
    if (state.farmerLocation) {
      formData.append("latitude", state.farmerLocation.latitude);
      formData.append("longitude", state.farmerLocation.longitude);
    }
    if (type) formData.append("providerType", type);
    if (state.searchParams.searchQuery) formData.append("searchQuery", state.searchParams.searchQuery);
    if (state.searchParams.requestType) {
      formData.append("requestType", state.searchParams.requestType);
    }
    if (state.searchParams.maxDistanceMeters && !state.searchParams.searchQuery) {
      formData.append("maxDistanceMeters", state.searchParams.maxDistanceMeters.toString());
    }
    runDiscovery(formData);
  };

  const handleDistanceChange = (distance: number) => {
    setState((prev) => ({
      ...prev,
      searchParams: { ...prev.searchParams, maxDistanceMeters: distance },
      isLoading: true,
    }));

    const formData = new FormData();
    if (state.farmerLocation) {
      formData.append("latitude", state.farmerLocation.latitude);
      formData.append("longitude", state.farmerLocation.longitude);
    }
    formData.append("maxDistanceMeters", distance.toString());
    if (state.searchParams.searchQuery) formData.append("searchQuery", state.searchParams.searchQuery);
    if (state.searchParams.requestType) {
      formData.append("requestType", state.searchParams.requestType);
    }
    if (state.searchParams.providerType) {
      formData.append("providerType", state.searchParams.providerType);
    }
    runDiscovery(formData);
  };

  const query = state.searchParams.searchQuery?.trim() || "";

  // Derived state to determine what to render
  const isLocationMissingAndNoQuery = (state.locationStatus === "denied" || state.locationStatus === "unavailable" || state.locationStatus === "timeout") && !query;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden flex flex-col group">
      {/* Map ALWAYS rendered in the background */}
      <div className="absolute inset-0 bg-muted">
        <div className={`transition-opacity duration-150 h-full w-full ${state.isLoading || isPending ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
          <DiscoveryMap providers={state.providers} farmerLocation={state.farmerLocation} />
        </div>
      </div>

      {/* Foreground Floating Elements */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
        {/* Search Pill Container with responsive right padding when panel is open */}
        <div className="w-full transition-all duration-200 group-has-[#provider-detail-panel]:sm:pr-[416px]">
          {/* Floating Search Pill */}
          <div className="pt-4 px-4 sm:pt-6 sm:px-6 z-[60] relative pointer-events-auto w-full max-w-xl mx-auto">
            <div className="bg-background rounded-full shadow-lg border border-border flex items-center p-1 relative">
            <Search className="h-5 w-5 text-muted-foreground ml-3 shrink-0" />
            <Input
              id="location-search"
              type="text"
              placeholder={dict.discovery.searchPlaceholder}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 h-10 px-2 rounded-full w-full"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-muted-foreground hover:text-foreground p-2"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <Button 
              variant={isFilterExpanded ? "secondary" : "ghost"} 
              size="icon" 
              className="rounded-full shrink-0 h-10 w-10 ml-1"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Expanded Filter Panel */}
          {isFilterExpanded && (
            <Card className="mt-2 shadow-lg border-border/50 animate-in fade-in slide-in-from-top-2">
              <CardContent className="p-4 space-y-4">
                {!query && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{dict.discovery.radius}:</span>
                    <select
                      value={state.searchParams.maxDistanceMeters || 50000}
                      onChange={(e) => handleDistanceChange(parseInt(e.target.value))}
                      className="border border-border rounded-lg h-9 px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary tabular-nums font-semibold"
                    >
                      <option value={5000}>{dict.discovery.distance5km}</option>
                      <option value={10000}>{dict.discovery.distance10km}</option>
                      <option value={25000}>{dict.discovery.distance25km}</option>
                      <option value={50000}>{dict.discovery.distance50km}</option>
                      <option value={100000}>{dict.discovery.distance100km}</option>
                    </select>
                  </div>
                )}
                
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{dict.discovery.providerType}:</span>
                  <select
                    value={state.searchParams.providerType || ""}
                    onChange={(e) =>
                      handleProviderTypeChange(
                        e.target.value as "VET_DOCTOR" | "PARAVET_WORKER" | undefined
                      )
                    }
                    className="border border-border rounded-lg h-9 px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{dict.discovery.all}</option>
                    <option value="VET_DOCTOR">{dict.discovery.vetDoctors}</option>
                    <option value="PARAVET_WORKER">{dict.discovery.paravetWorkers}</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        </div>

        {/* Empty States / Loading States as floating cards */}
        <div className="flex-1 flex items-center justify-center pointer-events-none p-4">
          {state.locationStatus === "locating" && !query && (
            <Card className="bg-card/95 shadow-xl border-dashed pointer-events-auto">
              <CardContent className="flex flex-col items-center justify-center p-8">
                <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                <h3 className="font-semibold text-foreground tracking-heading text-balance">{dict.discovery.gettingLocation}</h3>
              </CardContent>
            </Card>
          )}

          {isLocationMissingAndNoQuery && state.locationStatus !== "locating" && (
            <Card className="bg-card/95 shadow-xl border-dashed pointer-events-auto max-w-sm">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <MapPinOff className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <h2 className="font-semibold text-lg mb-2 tracking-heading text-balance">{dict.discovery.locationAccessNeeded}</h2>
                <p className="text-base text-foreground mb-6 text-pretty">
                  {dict.discovery.enableLocationDescText}
                </p>
                <Button 
                  onClick={getCurrentLocation} 
                  className="h-[44px] px-6 text-sm font-medium w-full"
                >
                  <Crosshair className="h-4 w-4 mr-2" />
                  {dict.discovery.enableLocationRetry}
                </Button>
              </CardContent>
            </Card>
          )}

          {state.providers.length === 0 && !isLocationMissingAndNoQuery && state.locationStatus !== "locating" && (
            <Card className="bg-card/95 shadow-xl border-dashed pointer-events-auto max-w-sm">
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">{dict.discovery.noProvidersFound}</h3>
                  <p className="text-base text-foreground mb-4">
                    {query
                      ? dict.discovery.noProvidersMatched
                      : dict.discovery.tryExpandingSearch}
                  </p>
                  {query && (
                    <Button variant="outline" size="sm" onClick={handleClearSearch} className="h-9">
                      {dict.discovery.clearSearch}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* SOS Button (Pinned bottom-right, vertically aligned with carousel cards) */}
        <div className="absolute bottom-6 right-4 h-[118px] z-[45] flex items-center pointer-events-none">
          <div className="pointer-events-auto">
            {farmerId && (state.farmerLocation || query) ? (
              <SOSCreationModal
                farmerId={farmerId}
                latitude={state.farmerLocation?.latitude || "28.6139"}
                longitude={state.farmerLocation?.longitude || "77.2090"}
                locale={locale}
                trigger={
                  <Button
                    size="lg"
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-2xl animate-pulse h-[56px] px-6 text-base font-bold rounded-full flex items-center gap-2 border-2 border-background"
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
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-2xl animate-pulse h-[56px] px-6 text-base font-bold rounded-full flex items-center gap-2 border-2 border-background"
              >
                <AlertTriangle className="h-5 w-5" />
                {dict.discovery.emergency}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}