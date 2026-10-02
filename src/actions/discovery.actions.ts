
"use server";

import { discoverNearbyProviders } from "@/services/discovery.service";
import { getCurrentSession } from "@/lib/auth/session";
import { success, error, type ActionResult } from "@/lib/result";
import { z } from "zod";
import { isAppError } from "@/lib/errors";

// Validation schemas
const discoverProvidersSchema = z.object({
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  requestType: z.enum(["SOS", "ROUTINE"]).optional(),
  maxDistanceMeters: z.number().min(1000).max(100000).optional(),
  providerType: z.enum(["VET_DOCTOR", "PARAVET_WORKER"]).optional(),
  searchQuery: z.string().optional(),
});

export type DiscoverProvidersInput = z.infer<typeof discoverProvidersSchema>;

export type DiscoverProvidersResult = {
  providers: Awaited<ReturnType<typeof discoverNearbyProviders>>;
};

/**
 * Discover nearby providers for a farmer
 */
export async function discoverProvidersAction(
  formData: FormData
): Promise<ActionResult<DiscoverProvidersResult>> {
  try {
    // Parse and validate input
    const input = discoverProvidersSchema.parse({
      latitude: formData.get("latitude") || undefined,
      longitude: formData.get("longitude") || undefined,
      requestType: formData.get("requestType") || undefined,
      maxDistanceMeters: formData.get("maxDistanceMeters")
        ? parseInt(formData.get("maxDistanceMeters") as string)
        : undefined,
      providerType: formData.get("providerType") || undefined,
      searchQuery: formData.get("searchQuery") || undefined,
    });

    // Allow public discovery (farmerId is optional on discover page)
    const session = await getCurrentSession();
    if (session && session.user.role !== "FARMER") {
      // If logged in as non-farmer (e.g. provider or admin), still allow viewing
    }

    const latitude = input.latitude ? parseFloat(input.latitude) : undefined;
    const longitude = input.longitude ? parseFloat(input.longitude) : undefined;
    const farmerLocation = (latitude !== undefined && longitude !== undefined && !isNaN(latitude) && !isNaN(longitude))
      ? { latitude, longitude }
      : null;

    // Discover nearby providers
    const providers = await discoverNearbyProviders(
      farmerLocation,
      {
        requestType: input.requestType,
        maxDistanceMeters: input.maxDistanceMeters,
        providerType: input.providerType,
        searchQuery: input.searchQuery,
        excludeUserId: session?.user?.id,
      }
    );

    return success({ providers });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code as any, `errors.${err.code}`);
    }

    if (err instanceof z.ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of err.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(issue.message);
      }
      return error("VALIDATION_ERROR", "errors.VALIDATION_ERROR", {
        fieldErrors,
      });
    }

    console.error("Discovery error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}