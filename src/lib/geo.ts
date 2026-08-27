import { db } from "@/db";
import { vetProfiles, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Result shape returned by getNearbyVets.
 */
export interface NearbyVet {
  userId: string;
  name: string;
  phone: string;
  role: string;
  qualification: string;
  registrationNo: string;
  clinicName: string | null;
  experienceYears: number;
  isVerified: boolean;
  latitude: number;
  longitude: number;
  addressText: string;
  baseVisitFee: number;
  perKmFee: number;
  serviceRadiusKm: number;
  distanceKm: number;
  estimatedTotalFee: number;
}

/**
 * Finds nearby on-duty vets within a given radius from the farmer's location.
 *
 * Strategy:
 * 1. Attempts PostGIS `ST_DistanceSphere` for accurate geodesic distance.
 * 2. Falls back to the Haversine formula if PostGIS extension is not installed.
 *
 * Results are sorted by distance (ascending) and include estimated travel fee.
 */
export async function getNearbyVets(
  farmerLat: number,
  farmerLng: number,
  maxRadiusKm: number = 25,
  roleFilter?: "VET_DOCTOR" | "PARAVET_WORKER"
): Promise<NearbyVet[]> {
  try {
    return await queryWithPostGIS(farmerLat, farmerLng, maxRadiusKm, roleFilter);
  } catch {
    // PostGIS extension not available — fallback to Haversine
    return await queryWithHaversine(farmerLat, farmerLng, maxRadiusKm, roleFilter);
  }
}

// ─── PostGIS Implementation ─────────────────────────────────────────────────

async function queryWithPostGIS(
  farmerLat: number,
  farmerLng: number,
  maxRadiusKm: number,
  roleFilter?: string
): Promise<NearbyVet[]> {
  const maxRadiusMeters = maxRadiusKm * 1000;

  const roleCondition = roleFilter
    ? sql`AND u.role = ${roleFilter}`
    : sql``;

  const rows = await db.execute(sql`
    SELECT
      u.id AS "userId",
      u.name,
      u.phone,
      u.role,
      vp.qualification,
      vp.registration_no AS "registrationNo",
      vp.clinic_name AS "clinicName",
      vp.experience_years AS "experienceYears",
      vp.is_verified AS "isVerified",
      vp.latitude,
      vp.longitude,
      vp.address_text AS "addressText",
      vp.base_visit_fee AS "baseVisitFee",
      vp.per_km_fee AS "perKmFee",
      vp.service_radius_km AS "serviceRadiusKm",
      ROUND(
        (ST_DistanceSphere(
          ST_MakePoint(vp.longitude, vp.latitude),
          ST_MakePoint(${farmerLng}, ${farmerLat})
        ) / 1000.0)::numeric,
        1
      ) AS "distanceKm"
    FROM vet_profiles vp
    INNER JOIN users u ON u.id = vp.user_id
    WHERE vp.is_on_duty = true
      AND vp.is_verified = true
      ${roleCondition}
      AND ST_DistanceSphere(
        ST_MakePoint(vp.longitude, vp.latitude),
        ST_MakePoint(${farmerLng}, ${farmerLat})
      ) <= ${maxRadiusMeters}
    ORDER BY "distanceKm" ASC
  `);

  return (rows as unknown as Record<string, unknown>[]).map(formatVetRow);
}

// ─── Haversine Fallback ─────────────────────────────────────────────────────

async function queryWithHaversine(
  farmerLat: number,
  farmerLng: number,
  maxRadiusKm: number,
  roleFilter?: string
): Promise<NearbyVet[]> {
  const roleCondition = roleFilter
    ? sql`AND u.role = ${roleFilter}`
    : sql``;

  // Haversine formula: 6371 * acos(cos(radians(lat1)) * cos(radians(lat2)) *
  //   cos(radians(lng2) - radians(lng1)) + sin(radians(lat1)) * sin(radians(lat2)))
  const rows = await db.execute(sql`
    SELECT
      u.id AS "userId",
      u.name,
      u.phone,
      u.role,
      vp.qualification,
      vp.registration_no AS "registrationNo",
      vp.clinic_name AS "clinicName",
      vp.experience_years AS "experienceYears",
      vp.is_verified AS "isVerified",
      vp.latitude,
      vp.longitude,
      vp.address_text AS "addressText",
      vp.base_visit_fee AS "baseVisitFee",
      vp.per_km_fee AS "perKmFee",
      vp.service_radius_km AS "serviceRadiusKm",
      ROUND(
        (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${farmerLat})) * cos(radians(vp.latitude)) *
            cos(radians(vp.longitude) - radians(${farmerLng})) +
            sin(radians(${farmerLat})) * sin(radians(vp.latitude))
          ))
        ))::numeric,
        1
      ) AS "distanceKm"
    FROM vet_profiles vp
    INNER JOIN users u ON u.id = vp.user_id
    WHERE vp.is_on_duty = true
      AND vp.is_verified = true
      ${roleCondition}
      AND (6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(${farmerLat})) * cos(radians(vp.latitude)) *
          cos(radians(vp.longitude) - radians(${farmerLng})) +
          sin(radians(${farmerLat})) * sin(radians(vp.latitude))
        ))
      )) <= ${maxRadiusKm}
    ORDER BY "distanceKm" ASC
  `);

  return (rows as unknown as Record<string, unknown>[]).map(formatVetRow);
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function formatVetRow(row: Record<string, unknown>): NearbyVet {
  const distanceKm = Number(row.distanceKm);
  const baseVisitFee = Number(row.baseVisitFee);
  const perKmFee = Number(row.perKmFee);

  return {
    userId: String(row.userId),
    name: String(row.name),
    phone: String(row.phone),
    role: String(row.role),
    qualification: String(row.qualification),
    registrationNo: String(row.registrationNo),
    clinicName: row.clinicName ? String(row.clinicName) : null,
    experienceYears: Number(row.experienceYears),
    isVerified: Boolean(row.isVerified),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    addressText: String(row.addressText),
    baseVisitFee,
    perKmFee,
    serviceRadiusKm: Number(row.serviceRadiusKm),
    distanceKm,
    estimatedTotalFee: baseVisitFee + Math.round(distanceKm * perKmFee),
  };
}
