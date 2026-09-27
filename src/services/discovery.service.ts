import "server-only";
import { db } from "@/db";
import { users, providerProfiles } from "@/db/schema";
import { eq, and, or, sql, ilike } from "drizzle-orm";
import { serverEnv } from "@/lib/env";
import { type Coordinates } from "@/lib/geo";
import { calculateFee } from "@/lib/fees";
import type { ProviderWithDistance, DiscoveryFilters } from "@/types/discovery";

/**
 * Discover nearby providers using PostGIS or Haversine fallback
 */
export async function discoverNearbyProviders(
  farmerLocation: Coordinates | null,
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

  const searchQuery = filters.searchQuery?.trim();
  const searchPattern = searchQuery ? `%${searchQuery}%` : undefined;

  let distanceExpr = sql<number | null>`NULL`;
  let distanceFilter = undefined;

  if (farmerLocation) {
    if (spatialMode === "postgis") {
      const farmerPoint = sql`ST_SetSRID(ST_MakePoint(${farmerLocation.longitude}::numeric, ${farmerLocation.latitude}::numeric), 4326)::geography`;
      distanceExpr = sql<number | null>`ST_Distance(
        ST_SetSRID(ST_MakePoint(${providerProfiles.longitude}::numeric, ${providerProfiles.latitude}::numeric), 4326)::geography,
        ${farmerPoint}
      )`;
      if (!searchQuery) {
        distanceFilter = sql`ST_DWithin(
          ST_SetSRID(ST_MakePoint(${providerProfiles.longitude}::numeric, ${providerProfiles.latitude}::numeric), 4326)::geography,
          ${farmerPoint},
          ${maxDistance}
        )`;
      }
    } else {
      const farmerLat = farmerLocation.latitude;
      const farmerLng = farmerLocation.longitude;
      distanceExpr = sql<number | null>`
        (2.0 * 6371008.8 * asin(sqrt(
          LEAST(1.0, GREATEST(0.0, 
            power(sin(radians(${providerProfiles.latitude}::numeric - ${farmerLat}) / 2.0), 2) +
            cos(radians(${farmerLat})) * cos(radians(${providerProfiles.latitude}::numeric)) *
            power(sin(radians(${providerProfiles.longitude}::numeric - ${farmerLng}) / 2.0), 2)
          ))
        )))
      `;
      if (!searchQuery) {
        distanceFilter = sql`${distanceExpr} <= ${maxDistance}`;
      }
    }
  }

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
        // Text search filter
        searchPattern
          ? or(
              ilike(users.name, searchPattern),
              ilike(providerProfiles.district, searchPattern),
              ilike(providerProfiles.villageOrServiceArea, searchPattern)
            )
          : undefined,
        // Spatial filter
        distanceFilter
      )
    );

  if (farmerLocation) {
    query.orderBy(sql`distance_meters`);
  } else {
    query.orderBy(users.name);
  }

  try {
    const results = await query;
    return results
      .filter((row) => row.latitude != null && row.longitude != null)
      .map((row) => {
        const distanceMeters = row.distanceMeters != null ? Math.round(row.distanceMeters) : null;
        let feeBreakdown = null;
        if (distanceMeters != null) {
          feeBreakdown = calculateFee(
            row.baseVisitFeePaise,
            row.perKmFeePaise,
            distanceMeters
          );
        }

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
  } catch (error) {
    console.error("Discovery error:", error);
    throw error;
  }
}