/**
 * Geospatial utilities
 *
 * Distance calculations using Haversine formula
 * (used as fallback when PostGIS is not available)
 */

export type Coordinates = {
  latitude: number;
  longitude: number;
};

/**
 * Validate latitude (-90 to 90)
 */
export function isValidLatitude(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

/**
 * Validate longitude (-180 to 180)
 */
export function isValidLongitude(lng: number): boolean {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

/**
 * Validate coordinates
 */
export function isValidCoordinates(coords: Coordinates): boolean {
  return isValidLatitude(coords.latitude) && isValidLongitude(coords.longitude);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 *
 * Formula:
 * a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
 * c = 2 × atan2(√a, √(1−a))
 * d = R × c
 *
 * where R = 6371000 meters (Earth's radius)
 */
export function haversineDistance(
  from: Coordinates,
  to: Coordinates
): number {
  const R = 6371000; // Earth's radius in meters

  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Check if a point is within a radius of another point
 */
export function isWithinRadius(
  center: Coordinates,
  point: Coordinates,
  radiusMeters: number
): boolean {
  const distance = haversineDistance(center, point);
  return distance <= radiusMeters;
}

/**
 * Calculate bearing between two coordinates (0-360 degrees)
 * 0 = North, 90 = East, 180 = South, 270 = West
 */
export function calculateBearing(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  const bearing = toDegrees(Math.atan2(y, x));

  return (bearing + 360) % 360;
}

/**
 * Get compass direction from bearing
 */
export function getCompassDirection(bearing: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(coords: Coordinates): string {
  const lat = coords.latitude.toFixed(6);
  const lng = coords.longitude.toFixed(6);
  return `${lat}, ${lng}`;
}

/**
 * Parse coordinates from string
 * Accepts formats: "lat,lng" or "lat, lng"
 */
export function parseCoordinates(input: string): Coordinates | null {
  const parts = input.split(",").map((s) => s.trim());

  if (parts.length !== 2) {
    return null;
  }

  const latitude = parseFloat(parts[0]);
  const longitude = parseFloat(parts[1]);

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

/**
 * Get bounding box for a circle (for database queries)
 */
export function getBoundingBox(
  center: Coordinates,
  radiusMeters: number
): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  // Approximate degrees per meter
  const latDegreePerMeter = 1 / 111320;
  const lngDegreePerMeter =
    1 / (111320 * Math.cos(toRadians(center.latitude)));

  const deltaLat = radiusMeters * latDegreePerMeter;
  const deltaLng = radiusMeters * lngDegreePerMeter;

  return {
    minLat: center.latitude - deltaLat,
    maxLat: center.latitude + deltaLat,
    minLng: center.longitude - deltaLng,
    maxLng: center.longitude + deltaLng,
  };
}

/**
 * Location accuracy levels
 */
export type LocationSource = "GPS" | "MAP_PIN" | "APPROXIMATE";

export type LocationAccuracy = {
  source: LocationSource;
  accuracyMeters?: number;
  confirmedAt: Date;
};

/**
 * Validate location accuracy
 */
export function isAccurateEnough(
  accuracy: LocationAccuracy,
  requiredAccuracyMeters: number
): boolean {
  if (accuracy.source === "GPS" && accuracy.accuracyMeters) {
    return accuracy.accuracyMeters <= requiredAccuracyMeters;
  }

  // MAP_PIN and APPROXIMATE are always considered "accurate enough"
  // for discovery purposes, but should be labeled appropriately
  return true;
}
