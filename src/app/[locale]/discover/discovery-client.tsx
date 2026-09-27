"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useTranslation } from "@/i18n/client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { MapPin, Loader2, Search, Crosshair, RefreshCw, AlertTriangle, Calendar, X, MapPinOff } from "lucide-react";
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
  const [isPending, startTransition] = useTransition();

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
    <div className="space-y-6 relative pb-20">
      {/* Primary Search & Quick Actions Box */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="max-w-xl mx-auto">
          <label htmlFor="location-search" className="block text-sm font-semibold text-foreground mb-2">
            {dict.discovery.searchPlaceholder}
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="location-search"
              type="text"
              placeholder={dict.discovery.searchPlaceholder}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-11 pr-10 h-[44px] text-base rounded-lg border-input focus:ring-2 focus:ring-primary"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center items-center">
          {farmerId && (state.farmerLocation || query) ? (
            <SOSCreationModal
              farmerId={farmerId}
              latitude={state.farmerLocation?.latitude || "28.6139"}
              longitude={state.farmerLocation?.longitude || "77.2090"}
              locale={locale}
              trigger={
                <Button
                  size="default"
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold h-[44px] px-5 rounded-lg shadow-sm flex items-center gap-2"
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
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold h-[44px] px-5 rounded-lg shadow-sm flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {dict.discovery.emergency}
            </Button>
          )}

          <Button
            variant="outline"
            size="default"
            onClick={() => handleRequestTypeChange("ROUTINE")}
            className="h-[44px] px-5 rounded-lg font-medium flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            {dict.discovery.routine}
          </Button>

          <Button
            variant="outline"
            size="default"
            onClick={getCurrentLocation}
            className="h-[44px] px-4 rounded-lg flex items-center gap-2"
            disabled={state.locationStatus === "locating"}
          >
            <RefreshCw className={`h-4 w-4 ${state.locationStatus === "locating" ? "animate-spin" : ""}`} />
            {dict.discovery.refresh}
          </Button>
        </div>
      </div>

      {state.locationStatus === "locating" && !query && (
        <Card className="bg-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <h3 className="font-semibold text-lg text-foreground">{dict.discovery.gettingLocation || "Getting your location..."}</h3>
          </CardContent>
        </Card>
      )}

      {isLocationMissingAndNoQuery && state.locationStatus !== "locating" && (
        <Card className="bg-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <MapPinOff className="h-14 w-14 text-muted-foreground mx-auto mb-5" />
            <h2 className="font-semibold text-xl mb-2">{dict.discovery.enableLocation || "Location access needed"}</h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              {dict.discovery.enableLocationDesc || "Please enable location to find nearby providers or use the search bar to find providers by name or area."}
            </p>
            <Button 
              size="lg" 
              onClick={getCurrentLocation} 
              className="h-[44px] px-8 text-base font-medium min-w-[200px]"
            >
              <Crosshair className="h-4 w-4 mr-2" />
              {dict.discovery.enableLocation || "Enable Location / Try Again"}
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLocationMissingAndNoQuery && state.locationStatus !== "locating" && (
        <>
          {/* Filter and Radius Controls */}
          <Card className="bg-card">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>
                    {state.providers.length} {dict.discovery.providersFound}
                  </span>
                  {query && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Matching "{query}"
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {!query && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{dict.discovery.radius}:</span>
                      <select
                        value={state.searchParams.maxDistanceMeters || 50000}
                        onChange={(e) => handleDistanceChange(parseInt(e.target.value))}
                        className="border border-border rounded-lg h-[44px] px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value={5000}>{dict.discovery.distance5km}</option>
                        <option value={10000}>{dict.discovery.distance10km}</option>
                        <option value={25000}>{dict.discovery.distance25km}</option>
                        <option value={50000}>{dict.discovery.distance50km}</option>
                        <option value={100000}>{dict.discovery.distance100km}</option>
                      </select>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{dict.discovery.providerType}:</span>
                    <select
                      value={state.searchParams.providerType || ""}
                      onChange={(e) =>
                        handleProviderTypeChange(
                          e.target.value as "VET_DOCTOR" | "PARAVET_WORKER" | undefined
                        )
                      }
                      className="border border-border rounded-lg h-[44px] px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
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
          {state.providers.length > 0 ? (
            <div className={`transition-opacity duration-150 ${state.isLoading || isPending ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
              <DiscoveryMap providers={state.providers} farmerLocation={state.farmerLocation} />
            </div>
          ) : (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center max-w-sm">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-1">{dict.discovery.noProvidersFound}</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {query
                      ? `No providers matched "${query}". Try clearing the search or widening your radius.`
                      : dict.discovery.tryExpandingSearch}
                  </p>
                  {query && (
                    <Button variant="outline" size="lg" onClick={handleClearSearch} className="h-[44px]">
                      {dict.discovery.clearSearch}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Floating SOS Button (Fixed in Bottom-Right Corner) */}
      <div className="fixed bottom-6 right-6 z-50">
        {farmerId && (state.farmerLocation || query) ? (
          <SOSCreationModal
            farmerId={farmerId}
            latitude={state.farmerLocation?.latitude || "28.6139"}
            longitude={state.farmerLocation?.longitude || "77.2090"}
            locale={locale}
            trigger={
              <Button
                size="lg"
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-2xl animate-pulse h-14 px-6 text-base font-bold rounded-full flex items-center gap-2 border-2 border-background"
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
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-2xl animate-pulse h-14 px-6 text-base font-bold rounded-full flex items-center gap-2 border-2 border-background"
          >
            <AlertTriangle className="h-5 w-5" />
            {dict.discovery.emergency}
          </Button>
        )}
      </div>
    </div>
  );
}