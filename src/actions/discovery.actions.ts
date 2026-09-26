
"use server";

import { discoverNearbyProviders } from "@/services/discovery.service";
import { requireSession } from "@/lib/auth/session";
import { success, error, type ActionResult } from "@/lib/result";
import { z } from "zod";
import { isAppError } from "@/lib/errors";

// Validation schemas
const discoverProvidersSchema = z.object({
  latitude: z.string(),
  longitude: z.string(),
  requestType: z.enum(["SOS", "ROUTINE"]).optional(),
  maxDistanceMeters: z.number().min(1000).max(100000).optional(),
  providerType: z.enum(["VET_DOCTOR", "PARAVET_WORKER"]).optional(),
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
      latitude: formData.get("latitude"),
      longitude: formData.get("longitude"),
      requestType: formData.get("requestType") || undefined,
      maxDistanceMeters: formData.get("maxDistanceMeters")
        ? parseInt(formData.get("maxDistanceMeters") as string)
        : undefined,
      providerType: formData.get("providerType") || undefined,
    });

    // Verify the requesting user is an authenticated farmer
    const session = await requireSession();
    if (session.user.role !== "FARMER") {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    // Discover nearby providers
    const providers = await discoverNearbyProviders(
      {
        latitude: parseFloat(input.latitude),
        longitude: parseFloat(input.longitude),
      },
      {
        requestType: input.requestType,
        maxDistanceMeters: input.maxDistanceMeters,
        providerType: input.providerType,
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