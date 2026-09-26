
"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/i18n/client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon, LatLng } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageCircle, MapPin, Star, Clock, Filter } from "lucide-react";
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
  };
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

  // Filter providers based on filters
  const filteredProviders = providers.filter((provider) => {
    if (filters.providerType && provider.providerType !== filters.providerType) {
      return false;
    }
    if (provider.distanceMeters > filters.maxDistance) {
      return false;
    }
    return true;
  });

  const handleProviderClick = (provider: ProviderWithDistance) => {
    setSelectedProvider(provider);
    onProviderSelect?.(provider);
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

  const getDistanceText = (meters: number) => {
    if (meters < 1000) {
      return `${meters}m`;
    } else if (meters < 10000) {
      return `${Math.round(meters / 100) / 10}km`;
    } else {
      return `${Math.round(meters / 1000)}km`;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Map Section */}
      <div className="lg:col-span-2 relative">
        <div className="h-full rounded-lg border bg-card">
          <MapContainer
            center={[parseFloat(farmerLocation.latitude), parseFloat(farmerLocation.longitude)]}
            zoom={13}
            style={{ height: "600px", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Farmer location marker */}
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

            {/* Provider markers */}
            {filteredProviders.map((provider) => (
              <Marker
                key={provider.id}
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
                    <div className="text-xs font-medium mb-2">
                      {provider.distanceMeters < 5000 ? "Nearby" : "Within range"}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Filters */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {dict.discovery.filters}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {dict.discovery.providerType}
              </label>
              <div className="flex gap-2">
                <Button
                  variant={filters.providerType === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilters({ ...filters, providerType: null })}
                >
                  {dict.discovery.all}
                </Button>
                <Button
                  variant={filters.providerType === "VET_DOCTOR" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilters({ ...filters, providerType: "VET_DOCTOR" })}
                  className="border-blue-300 hover:bg-blue-50"
                >
                  {dict.discovery.vetDoctors}
                </Button>
                <Button
                  variant={filters.providerType === "PARAVET_WORKER" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilters({ ...filters, providerType: "PARAVET_WORKER" })}
                  className="border-green-300 hover:bg-green-50"
                >
                  {dict.discovery.paravetWorkers}
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {dict.discovery.maxDistance} ({getDistanceText(filters.maxDistance)})
              </label>
              <input
                type="range"
                min="1000"
                max="100000"
                step="1000"
                value={filters.maxDistance}
                onChange={(e) => setFilters({ ...filters, maxDistance: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1km</span>
                <span>100km</span>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              {filteredProviders.length} {dict.discovery.providersFound}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Details Section */}
      <div className="space-y-4">
        {selectedProvider ? (
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedProvider.name}</CardTitle>
                  <CardDescription>{selectedProvider.qualification}</CardDescription>
                </div>
                <Badge className={getProviderTypeColor(selectedProvider.providerType)}>
                  {selectedProvider.providerType === "VET_DOCTOR"
                    ? dict.discovery.vetDoctor
                    : dict.discovery.paravetWorker}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
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
                  <span>Available now</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 text-muted-foreground font-bold">₹</span>
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
                      className="flex-1"
                      onClick={(e) => handleContactProvider(selectedProvider, e)}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      {dict.discovery.contact}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => handleRequestService(selectedProvider, e)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {dict.discovery.emergency}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-blue-200 hover:bg-blue-50 text-blue-700"
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
        ) : (
          <Card className="bg-muted/50">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">{dict.discovery.selectProvider}</h3>
                <p className="text-sm text-muted-foreground">
                  {dict.discovery.clickOnMapToSelect}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Provider List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {dict.discovery.providersNearby}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredProviders.slice(0, 5).map((provider) => (
              <div
                key={provider.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${selectedProvider?.id === provider.id ? "bg-muted" : ""}`}
                onClick={() => handleProviderClick(provider)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-sm">{provider.name}</h4>
                    <p className="text-xs text-muted-foreground">{provider.qualification}</p>
                  </div>
                  <Badge className={getProviderTypeColor(provider.providerType)} variant="secondary">
                    {provider.providerType === "VET_DOCTOR" ? "VET" : "PARA"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {getDistanceText(provider.distanceMeters)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="font-bold">₹</span>
                    {provider.baseVisitFeePaise / 100}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}