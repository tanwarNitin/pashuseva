import { FeeBreakdown } from "@/lib/fees";

export type ProviderWithDistance = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  providerType: "VET_DOCTOR" | "PARAVET_WORKER";
  registrationNumber: string;
  qualification: string;
  specializationArea: string | null;
  yearsOfExperience: number | null;
  bio: string | null;
  district: string | null;
  state: string | null;
  villageOrServiceArea: string | null;
  baseVisitFeePaise: number;
  perKmFeePaise: number;
  serviceRadiusMeters: number | null;
  preferWhatsApp: boolean;
  latitude: string;
  longitude: string;
  distanceMeters: number | null;
  feeBreakdown: FeeBreakdown | null;
};

export type DiscoveryFilters = {
  requestType?: "SOS" | "ROUTINE";
  maxDistanceMeters?: number;
  providerType?: "VET_DOCTOR" | "PARAVET_WORKER";
  searchQuery?: string;
  excludeUserId?: string;
};