/**
 * Fee calculation utilities
 *
 * All fees are stored and calculated in integer paise (1 INR = 100 paise)
 * This avoids floating-point precision issues
 */

export type FeeBreakdown = {
  baseVisitFeePaise: number;
  perKmFeePaise: number;
  distanceMeters: number;
  travelFeePaise: number;
  totalFeePaise: number;
};

/**
 * Calculate service fee from distance
 *
 * Formula:
 * travelFeePaise = round((distanceMeters / 1000) × perKmFeePaise)
 * totalFeePaise = baseVisitFeePaise + travelFeePaise
 *
 * @param baseVisitFeePaise Base visit fee in paise
 * @param perKmFeePaise Travel fee per kilometer in paise
 * @param distanceMeters Straight-line distance in meters
 * @returns Fee breakdown with all values in paise
 */
export function calculateFee(
  baseVisitFeePaise: number,
  perKmFeePaise: number,
  distanceMeters: number
): FeeBreakdown {
  // Calculate travel fee from unrounded distance
  const distanceKm = distanceMeters / 1000;
  const travelFeePaise = Math.round(distanceKm * perKmFeePaise);

  const totalFeePaise = baseVisitFeePaise + travelFeePaise;

  return {
    baseVisitFeePaise,
    perKmFeePaise,
    distanceMeters,
    travelFeePaise,
    totalFeePaise,
  };
}

/**
 * Format paise to INR currency string
 * Uses Intl.NumberFormat for proper locale formatting
 */
export function formatINR(paise: number, locale: string = "en-IN"): string {
  const rupees = paise / 100;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Format distance in meters to display string
 */
export function formatDistance(meters: number, locale: string = "en-IN"): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
}

/**
 * Parse INR input to paise
 * Handles various input formats: "100", "100.50", "₹100.50"
 */
export function parseINRToPaise(input: string): number | null {
  // Remove currency symbols and whitespace
  const cleaned = input.replace(/[₹,\s]/g, "");

  const parsed = parseFloat(cleaned);

  if (isNaN(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

/**
 * Validate fee values
 */
export function isValidFee(paise: number): boolean {
  return Number.isInteger(paise) && paise >= 0;
}

/**
 * Create a fee breakdown display object
 */
export type FeeDisplay = {
  baseVisitFee: string;
  travelFee: string;
  totalFee: string;
  distance: string;
};

/**
 * Format fee breakdown for display
 */
export function formatFeeBreakdown(
  breakdown: FeeBreakdown,
  locale: string = "en-IN"
): FeeDisplay {
  return {
    baseVisitFee: formatINR(breakdown.baseVisitFeePaise, locale),
    travelFee: formatINR(breakdown.travelFeePaise, locale),
    totalFee: formatINR(breakdown.totalFeePaise, locale),
    distance: formatDistance(breakdown.distanceMeters, locale),
  };
}

/**
 * Example usage and test
 *
 * Test case from requirements:
 * Base: ₹200.00 (20000 paise)
 * Per km: ₹15.00 (1500 paise)
 * Distance: 4,250 meters
 *
 * Expected:
 * Travel: ₹63.75 (6375 paise)
 * Total: ₹263.75 (26375 paise)
 */
export function testFeeCalculation(): boolean {
  const result = calculateFee(20000, 1500, 4250);

  const expected = {
    baseVisitFeePaise: 20000,
    perKmFeePaise: 1500,
    distanceMeters: 4250,
    travelFeePaise: 6375,
    totalFeePaise: 26375,
  };

  return JSON.stringify(result) === JSON.stringify(expected);
}
