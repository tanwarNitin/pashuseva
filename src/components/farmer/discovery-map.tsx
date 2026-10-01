
"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/i18n/client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageCircle, MapPin, Star, Clock, Filter, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProviderWithDistance } from "@/types/discovery";

// Fix Leaflet marker icon issue - use local images or default Leaflet icons
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

const markerIcon = new Icon({
  iconUrl: (markerIconUrl as any).src || markerIconUrl,
  shadowUrl: (markerShadowUrl as any).src || markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface DiscoveryMapProps {
  providers: ProviderWithDistance[];
  farmerLocation: {
    latitude: string;
    longitude: string;
  } | null;
  onProviderSelect?: (provider: ProviderWithDistance) => void;
}

export default function DiscoveryMap({
  providers,
  farmerLocation,
  onProviderSelect,
}: DiscoveryMapProps) {
  const dict = useTranslation();
  const router = useRouter();
  const [selectedProvider, setSelectedProvider] = useState<ProviderWithDistance | null>(null);
  const [filters, setFilters] = useState({
    providerType: null as "VET_DOCTOR" | "PARAVET_WORKER" | null,
    maxDistance: 50000,
  });

  const mapRef = useRef<LeafletMap | null>(null);
  const markerRefs = useRef<Record<string, LeafletMarker | null>>({});

  // Filter providers based on filters
  const filteredProviders = providers.filter((provider) => {
    if (filters.providerType && provider.providerType !== filters.providerType) {
      return false;
    }
    if (provider.distanceMeters !== null && provider.distanceMeters > filters.maxDistance) {
      return false;
    }
    return true;
  });

  const handleProviderClick = (provider: ProviderWithDistance) => {
    setSelectedProvider(provider);
    onProviderSelect?.(provider);

    if (provider.latitude != null && provider.longitude != null && provider.latitude !== "" && provider.longitude !== "") {
      const lat = parseFloat(provider.latitude);
      const lng = parseFloat(provider.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], 13, { duration: 0.5 });
        }
        const marker = markerRefs.current[provider.id];
        if (marker) {
          marker.openPopup();
        }
      }
    }
  };

  const handleContactProvider = (provider: ProviderWithDistance, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/provider/${provider.id}/contact`);
  };

  const handleRequestService = (provider: ProviderWithDistance, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/request?provider=${provider.id}`);
  };

  const getProviderTypeColor = (type: string) => {
    return type === "VET_DOCTOR"
      ? "bg-blue-100 text-blue-800 border-blue-300"
      : "bg-green-100 text-green-800 border-green-300";
  };

  const getDistanceText = (meters: number | null) => {
    if (meters === null) return "Distance N/A";
    if (meters < 1000) {
      return `${meters}m`;
    } else if (meters < 10000) {
      return `${Math.round(meters / 100) / 10}km`;
    } else {
      return `${Math.round(meters / 1000)}km`;
    }
  };

  // Determine center based on farmer location or provider bounds
  let centerLat = 28.6139; // Default (Delhi)
  let centerLng = 77.2090;
  if (farmerLocation) {
    centerLat = parseFloat(farmerLocation.latitude);
    centerLng = parseFloat(farmerLocation.longitude);
  } else if (providers.length > 0) {
    centerLat = providers.reduce((sum, p) => sum + parseFloat(p.latitude), 0) / providers.length;
    centerLng = providers.reduce((sum, p) => sum + parseFloat(p.longitude), 0) / providers.length;
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Map Section */}
      <div className="absolute inset-0 z-0 isolate">
        <MapContainer
          ref={mapRef}
          center={[centerLat, centerLng]}
          zoom={farmerLocation ? 13 : 11}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Farmer location marker */}
          {farmerLocation && (
            <Marker
              position={[parseFloat(farmerLocation.latitude), parseFloat(farmerLocation.longitude)]}
              icon={markerIcon}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{dict.discovery.farmerLocation}</strong>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Provider markers */}
          {providers.map((provider) => (
            <Marker
              key={provider.id}
              ref={(node) => {
                if (node) {
                  markerRefs.current[provider.id] = node;
                } else {
                  delete markerRefs.current[provider.id];
                }
              }}
              position={[parseFloat(provider.latitude), parseFloat(provider.longitude)]}
              icon={markerIcon}
              eventHandlers={{
                click: () => handleProviderClick(provider),
              }}
            >
              <Popup>
                <div className="text-sm max-w-xs">
                  <div className="font-semibold text-base mb-1">
                    {provider.name}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {provider.qualification}
                  </div>
                  
                  <div className="flex items-center gap-1 mb-2">
                    <MapPin className="h-3 w-3" />
                    <span className="text-xs">Distance: {getDistanceText(provider.distanceMeters)}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="h-3 w-3 text-yellow-500 opacity-50" />
                    <span className="text-xs text-muted-foreground">No ratings yet</span>
                  </div>
                  {provider.distanceMeters !== null && (
                    <div className="text-xs font-medium mb-2">
                      {provider.distanceMeters < 5000 ? "Nearby" : "Within range"}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Detail Overlay (Desktop sidebar / Mobile bottom sheet) */}
      {selectedProvider && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-end sm:items-start justify-end p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/20 sm:hidden pointer-events-auto" onClick={() => setSelectedProvider(null)} />
          <Card id="provider-detail-panel" className="w-full sm:w-[400px] h-[85vh] sm:h-auto sm:max-h-[calc(100vh-8rem)] overflow-y-auto shadow-2xl pointer-events-auto rounded-t-xl sm:rounded-xl rounded-b-none sm:rounded-b-xl border-t sm:border animate-in slide-in-from-bottom-full sm:slide-in-from-right-8 duration-200">
            <CardHeader className="pb-3 sticky top-0 bg-card z-10 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedProvider.name}</CardTitle>
                  <CardDescription>{selectedProvider.qualification}</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedProvider(null)}
                  className="h-[44px] w-[44px] px-0 text-muted-foreground hover:text-foreground"
                  aria-label={dict.discovery.closeDetails}
                  title={dict.discovery.closeDetails}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <Badge className={`w-fit mt-3 ${getProviderTypeColor(selectedProvider.providerType)}`}>
                {selectedProvider.providerType === "VET_DOCTOR"
                  ? dict.discovery.vetDoctor
                  : dict.discovery.paravetWorker}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{getDistanceText(selectedProvider.distanceMeters)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 opacity-50" />
                  <span className="text-muted-foreground">No ratings yet</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    Available
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 text-muted-foreground font-bold text-center">₹</span>
                  <span>{selectedProvider.baseVisitFeePaise / 100} - {(selectedProvider.baseVisitFeePaise + selectedProvider.perKmFeePaise * 1000) / 100}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Specialization</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedProvider.specializationArea || dict.discovery.noSpecialization}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Bio</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedProvider.bio || dict.discovery.noBioAvailable}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Contact</h4>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-[44px]"
                      onClick={(e) => handleContactProvider(selectedProvider, e)}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      {dict.discovery.contact}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-[44px]"
                      onClick={(e) => handleRequestService(selectedProvider, e)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {dict.discovery.emergency}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-[44px] border-blue-200 hover:bg-blue-50 text-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/book/${selectedProvider.id}`);
                    }}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {dict.routine?.bookVisit || "Book Routine Visit"}
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Services</h4>
                <div className="flex flex-wrap gap-1">
                  {["CONSULTATION", "EMERGENCY", "VACCINATION"].map((service) => (
                    <Badge key={service} variant="secondary" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Providers Carousel (Bottom Anchored) */}
      {!selectedProvider && providers.length > 0 && (
        <div className="absolute bottom-4 left-0 right-0 z-40 pointer-events-none">
          <div className="flex overflow-x-auto snap-x snap-mandatory px-4 pb-2 gap-4 no-scrollbar pointer-events-auto">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="snap-center shrink-0 w-[280px] bg-background rounded-xl shadow-lg border p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => handleProviderClick(provider)}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-sm line-clamp-1">{provider.name}</h4>
                  <Badge className={`text-[10px] h-5 px-1.5 ${getProviderTypeColor(provider.providerType)}`} variant="secondary">
                    {provider.providerType === "VET_DOCTOR" ? "VET" : "PARA"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{provider.qualification}</p>
                <div className="flex items-end justify-between mt-auto">
                  <div>
                    <span className="text-2xl font-bold tracking-tight">
                      {provider.distanceMeters !== null ? (
                        provider.distanceMeters < 1000 
                          ? provider.distanceMeters 
                          : Math.round(provider.distanceMeters / 100) / 10
                      ) : (
                        "--"
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      {provider.distanceMeters !== null ? (provider.distanceMeters < 1000 ? "m" : "km") : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Available</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}