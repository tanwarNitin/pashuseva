import "server-only";
import { db } from "@/db";
import { users, providerProfiles } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { serverEnv } from "@/lib/env";
import { haversineDistance, type Coordinates } from "@/lib/geo";
import { calculateFee, type FeeBreakdown } from "@/lib/fees";

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
  distanceMeters: number;
  feeBreakdown: FeeBreakdown;
};

export type DiscoveryFilters = {
  requestType?: "SOS" | "ROUTINE";
  maxDistanceMeters?: number;
  providerType?: "VET_DOCTOR" | "PARAVET_WORKER";
};

/**
 * Discover nearby providers using PostGIS or Haversine fallback
 */
export async function discoverNearbyProviders(
  farmerLocation: Coordinates,
  filters: DiscoveryFilters = {}
): Promise<ProviderWithDistance[]> {
  const spatialMode = serverEnv.DB_SPATIAL_MODE;

  // SOS defaults to veterinary doctors only
  const providerType =
    filters.providerType ||
    (filters.requestType === "SOS" ? "VET_DOCTOR" : undefined);

  // Maximum search radius (default 50km, max 100km)
  const maxDistance = Math.min(
    filters.maxDistanceMeters || 50000,
    100000
  );

  try {
    if (spatialMode === "postgis") {
      return await discoverWithPostGIS(
        farmerLocation,
        maxDistance,
        providerType
      );
    } else if (spatialMode === "haversine") {
      return await discoverWithHaversine(
        farmerLocation,
        maxDistance,
        providerType
      );
    } else {
      // AUTO mode: try PostGIS, fall back to Haversine
      try {
        return await discoverWithPostGIS(
          farmerLocation,
          maxDistance,
          providerType
        );
      } catch (error: any) {
        if (
          error.message?.includes("geography") ||
          error.message?.includes("ST_DWithin") ||
          error.message?.includes("postgis")
        ) {
          console.warn(
            "PostGIS not available, falling back to Haversine"
          );
          return await discoverWithHaversine(
            farmerLocation,
            maxDistance,
            providerType
          );
        }
        throw error;
      }
    }
  } catch (error) {
    console.error("Discovery error:", error);
    throw error;
  }
}

/**
 * Discover using PostGIS ST_DWithin
 */
async function discoverWithPostGIS(
  farmerLocation: Coordinates,
  maxDistanceMeters: number,
  providerType?: "VET_DOCTOR" | "PARAVET_WORKER"
): Promise<ProviderWithDistance[]> {
  // Build farmer point
  const farmerPoint = sql`ST_SetSRID(ST_MakePoint(${farmerLocation.longitude}::numeric, ${farmerLocation.latitude}::numeric), 4326)::geography`;

  // Query with spatial filter using providerProfiles table
  const query = db
    .select({
      providerId: providerProfiles.userId,
      userId: providerProfiles.userId,
      name: users.name,
      phone: users.phone,
      providerType: users.role,
      registrationNumber: providerProfiles.registrationNumber,
      qualification: providerProfiles.qualification,
      specializationArea: providerProfiles.specializationArea,
      yearsOfExperience: providerProfiles.yearsOfExperience,
      bio: providerProfiles.bio,
      district: providerProfiles.district,
      state: providerProfiles.state,
      villageOrServiceArea: providerProfiles.villageOrServiceArea,
      baseVisitFeePaise: providerProfiles.baseVisitFeePaise,
      perKmFeePaise: providerProfiles.perKmFeePaise,
      serviceRadiusMeters: providerProfiles.serviceRadiusMeters,
      preferWhatsApp: providerProfiles.preferWhatsApp,
      latitude: providerProfiles.latitude,
      longitude: providerProfiles.longitude,
      distanceMeters: sql<number>`ST_Distance(
        ST_SetSRID(ST_MakePoint(${providerProfiles.longitude}::numeric, ${providerProfiles.latitude}::numeric), 4326)::geography,
        ${farmerPoint}
      )`.as("distance_meters"),
    })
    .from(providerProfiles)
    .innerJoin(users, eq(providerProfiles.userId, users.id))
    .where(
      and(
        // Only verified providers
        eq(providerProfiles.verificationStatus, "VERIFIED"),
        // Only on-duty providers
        eq(providerProfiles.dutyStatus, "ON_DUTY"),
        // Only active accounts
        eq(users.status, "ACTIVE"),
        // Has location
        sql`${providerProfiles.latitude} IS NOT NULL`,
        sql`${providerProfiles.longitude} IS NOT NULL`,
        // Provider type filter
        providerType ? eq(users.role, providerType) : undefined,
        // Spatial filter using ST_DWithin
        sql`ST_DWithin(
          ST_SetSRID(ST_MakePoint(${providerProfiles.longitude}::numeric, ${providerProfiles.latitude}::numeric), 4326)::geography,
          ${farmerPoint},
          ${maxDistanceMeters}
        )`
      )
    )
    .orderBy(sql`distance_meters`);

  const results = await query;

  return results
    .filter((row) => row.latitude != null && row.longitude != null)
    .map((row) => {
      const distanceMeters = Math.round(row.distanceMeters);
      const feeBreakdown = calculateFee(
        row.baseVisitFeePaise,
        row.perKmFeePaise,
        distanceMeters
      );

      return {
        id: row.providerId,
        userId: row.userId,
        name: row.name,
        phone: row.phone,
        providerType: row.providerType as "VET_DOCTOR" | "PARAVET_WORKER",
        registrationNumber: row.registrationNumber,
        qualification: row.qualification,
        specializationArea: row.specializationArea,
        yearsOfExperience: row.yearsOfExperience,
        bio: row.bio,
        district: row.district,
        state: row.state,
        villageOrServiceArea: row.villageOrServiceArea,
        baseVisitFeePaise: row.baseVisitFeePaise,
        perKmFeePaise: row.perKmFeePaise,
        serviceRadiusMeters: row.serviceRadiusMeters,
        preferWhatsApp: row.preferWhatsApp,
        latitude: row.latitude!,
        longitude: row.longitude!,
        distanceMeters,
        feeBreakdown,
      };
    });
}

/**
 * Discover using Haversine formula (fallback when PostGIS unavailable)
 */
async function discoverWithHaversine(
  farmerLocation: Coordinates,
  maxDistanceMeters: number,
  providerType?: "VET_DOCTOR" | "PARAVET_WORKER"
): Promise<ProviderWithDistance[]> {
  const farmerLat = farmerLocation.latitude;
  const farmerLng = farmerLocation.longitude;

  const distanceExpr = sql<number>`
    (2.0 * 6371008.8 * asin(sqrt(
      LEAST(1.0, GREATEST(0.0, 
        power(sin(radians(${providerProfiles.latitude}::numeric - ${farmerLat}) / 2.0), 2) +
        cos(radians(${farmerLat})) * cos(radians(${providerProfiles.latitude}::numeric)) *
        power(sin(radians(${providerProfiles.longitude}::numeric - ${farmerLng}) / 2.0), 2)
      ))
    )))
  `;

  // Get all verified, on-duty providers with locations within maxDistanceMeters
  const query = db
    .select({
      providerId: providerProfiles.userId,
      userId: providerProfiles.userId,
      name: users.name,
      phone: users.phone,
      providerType: users.role,
      registrationNumber: providerProfiles.registrationNumber,
      qualification: providerProfiles.qualification,
      specializationArea: providerProfiles.specializationArea,
      yearsOfExperience: providerProfiles.yearsOfExperience,
      bio: providerProfiles.bio,
      district: providerProfiles.district,
      state: providerProfiles.state,
      villageOrServiceArea: providerProfiles.villageOrServiceArea,
      baseVisitFeePaise: providerProfiles.baseVisitFeePaise,
      perKmFeePaise: providerProfiles.perKmFeePaise,
      serviceRadiusMeters: providerProfiles.serviceRadiusMeters,
      preferWhatsApp: providerProfiles.preferWhatsApp,
      latitude: providerProfiles.latitude,
      longitude: providerProfiles.longitude,
      distanceMeters: distanceExpr.as("distance_meters"),
    })
    .from(providerProfiles)
    .innerJoin(users, eq(providerProfiles.userId, users.id))
    .where(
      and(
        eq(providerProfiles.verificationStatus, "VERIFIED"),
        eq(providerProfiles.dutyStatus, "ON_DUTY"),
        eq(users.status, "ACTIVE"),
        sql`${providerProfiles.latitude} IS NOT NULL`,
        sql`${providerProfiles.longitude} IS NOT NULL`,
        providerType ? eq(users.role, providerType) : undefined,
        sql`${distanceExpr} <= ${maxDistanceMeters}`
      )
    )
    .orderBy(sql`distance_meters`);

  const results = await query;

  return results.map((row) => {
    const distanceMeters = Math.round(row.distanceMeters);
    const feeBreakdown = calculateFee(
      row.baseVisitFeePaise,
      row.perKmFeePaise,
      distanceMeters
    );

    return {
      id: row.providerId,
      userId: row.userId,
      name: row.name,
      phone: row.phone,
      providerType: row.providerType as "VET_DOCTOR" | "PARAVET_WORKER",
      registrationNumber: row.registrationNumber,
      qualification: row.qualification,
      specializationArea: row.specializationArea,
      yearsOfExperience: row.yearsOfExperience,
      bio: row.bio,
      district: row.district,
      state: row.state,
      villageOrServiceArea: row.villageOrServiceArea,
      baseVisitFeePaise: row.baseVisitFeePaise,
      perKmFeePaise: row.perKmFeePaise,
      serviceRadiusMeters: row.serviceRadiusMeters,
      preferWhatsApp: row.preferWhatsApp,
      latitude: row.latitude!,
      longitude: row.longitude!,
      distanceMeters,
      feeBreakdown,
    };
  });
}