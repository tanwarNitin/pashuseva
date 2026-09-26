
"use server";

import { 
  createServiceRequest, 
  acceptServiceRequest, 
  declineServiceRequest,
  startServiceRequest,
  markServiceRequestDone,
  confirmServiceRequest,
  disputeServiceRequest,
  resolveDisputeServiceRequest,
  cancelServiceRequest,
  getFarmerRequestDetails,
  getProviderRequests,
  type FarmerRequestDetails
} from "@/services/request.service";
import { requireSession } from "@/lib/auth/session";
import { success, error, type ActionResult } from "@/lib/result";
import { z } from "zod";
import { headers } from "next/headers";
import { isAppError } from "@/lib/errors";

// Validation schemas
const createRequestSchema = z.object({
  farmerId: z.string().uuid(),
  animalId: z.string().uuid().optional(),
  kind: z.enum(["SOS", "ROUTINE"]),
  serviceCode: z.string().min(1),
  conditionSummary: z.string().min(10).max(1000),
  latitude: z.string(),
  longitude: z.string(),
  locationSource: z.string().default("GPS"),
  locationAccuracyM: z.string().optional(),
  locationDescription: z.string().optional(),
  scheduledFor: z.string().optional(),
  expiresAt: z.string(),
  clientRequestId: z.string(),
  idempotencyPayloadHash: z.string(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

/**
 * Create a new service request
 */
export async function createRequestAction(
  formData: FormData
): Promise<ActionResult<{ requestId: string }>> {
  try {
    // Parse and validate input
    const input = createRequestSchema.parse({
      farmerId: formData.get("farmerId"),
      animalId: formData.get("animalId") || undefined,
      kind: formData.get("kind"),
      serviceCode: formData.get("serviceCode"),
      conditionSummary: formData.get("conditionSummary"),
      latitude: formData.get("latitude"),
      longitude: formData.get("longitude"),
      locationSource: formData.get("locationSource") || "GPS",
      locationAccuracyM: formData.get("locationAccuracyM") || undefined,
      locationDescription: formData.get("locationDescription") || undefined,
      scheduledFor: formData.get("scheduledFor") || undefined,
      expiresAt: formData.get("expiresAt"),
      clientRequestId: formData.get("clientRequestId"),
      idempotencyPayloadHash: formData.get("idempotencyPayloadHash"),
    });

    // Verify the requesting user is the authenticated farmer
    const session = await requireSession();
    if (session.user.id !== input.farmerId || session.user.role !== "FARMER") {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    // Create the service request
    const request = await createServiceRequest(
      {
        farmerId: input.farmerId,
        animalId: input.animalId,
        kind: input.kind,
        serviceCode: input.serviceCode,
        conditionSummary: input.conditionSummary,
        latitude: input.latitude,
        longitude: input.longitude,
        locationSource: input.locationSource,
        locationAccuracyM: input.locationAccuracyM,
        locationDescription: input.locationDescription,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
        expiresAt: new Date(input.expiresAt),
        clientRequestId: input.clientRequestId,
        idempotencyPayloadHash: input.idempotencyPayloadHash,
      },
      session.user.id
    );

    return success({ requestId: request.id });
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

    console.error("Request creation error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}


/**
 * Get service requests for a farmer
 */
export async function getFarmerRequestsAction(
  farmerId: string
): Promise<ActionResult<any[]>> {
  try {
    const session = await requireSession();
    if (session.user.id !== farmerId || session.user.role !== "FARMER") {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    // In a real implementation, this would call the service layer
    // For now, return empty array
    return success([]);
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code as any, `errors.${err.code}`);
    }

    console.error("Get farmer requests error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}

/**
 * Get details for a specific request
 */
export async function getRequestDetailsAction(
  requestId: string
): Promise<ActionResult<FarmerRequestDetails>> {
  try {
    const session = await requireSession();
    if (session.user.role !== "FARMER") {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    const requestDetails = await getFarmerRequestDetails(requestId, session.user.id);
    return success(requestDetails);
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code as any, `errors.${err.code}`);
    }

    console.error("Get request details error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}

/**
 * Get service requests for a provider
 */
export async function getProviderRequestsAction(
  providerId: string
): Promise<ActionResult<any[]>> {
  try {
    const session = await requireSession();
    if (session.user.role !== "VET_DOCTOR" && session.user.role !== "PARAVET_WORKER") {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    const requests = await getProviderRequests(providerId, session.user.id);
    return success(requests);
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code as any, `errors.${err.code}`);
    }

    console.error("Get provider requests error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}

/**
 * Accept a service request
 */
export async function acceptRequestAction(
  formData: FormData
): Promise<ActionResult<void>> {
  try {
    const session = await requireSession();
    if (session.user.role !== "VET_DOCTOR" && session.user.role !== "PARAVET_WORKER") {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    const requestId = formData.get("requestId") as string;
    const providerId = formData.get("providerId") as string;

    if (!requestId || !providerId) {
      return error("VALIDATION_ERROR", "errors.VALIDATION_ERROR");
    }

    // Verify the requesting user is the provider
    if (providerId !== session.user.id) {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    await acceptServiceRequest(requestId, providerId, session.user.id);

    return success(undefined);
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code as any, `errors.${err.code}`);
    }

    console.error("Accept request error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}

/**
 * Decline a service request
 */
export async function declineRequestAction(
  formData: FormData
): Promise<ActionResult<void>> {
  try {
    const session = await requireSession();
    if (session.user.role !== "VET_DOCTOR" && session.user.role !== "PARAVET_WORKER") {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    const requestId = formData.get("requestId") as string;
    const providerId = formData.get("providerId") as string;
    const reason = formData.get("reason") as string;

    if (!requestId || !providerId || !reason) {
      return error("VALIDATION_ERROR", "errors.VALIDATION_ERROR");
    }

    // Verify the requesting user is the provider
    if (providerId !== session.user.id) {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    await declineServiceRequest(requestId, providerId, session.user.id, reason);

    return success(undefined);
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code as any, `errors.${err.code}`);
    }

    console.error("Decline request error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}

/**
 * Start a service request
 */
export async function startRequestAction(
  formData: FormData
): Promise<ActionResult<void>> {
  try {
    const session = await requireSession();
    if (session.user.role !== "VET_DOCTOR" && session.user.role !== "PARAVET_WORKER") {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    const requestId = formData.get("requestId") as string;
    const providerId = formData.get("providerId") as string;

    if (!requestId || !providerId) {
      return error("VALIDATION_ERROR", "errors.VALIDATION_ERROR");
    }

    // Verify the requesting user is the provider
    if (providerId !== session.user.id) {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    await startServiceRequest(requestId, providerId, session.user.id);

    return success(undefined);
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code as any, `errors.${err.code}`);
    }

    console.error("Start request error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}

/**
 * Mark a service request as done (by provider)
 */
export async function markRequestDoneAction(
  formData: FormData
): Promise<ActionResult<void>> {
  try {
    const session = await requireSession();
    if (session.user.role !== "VET_DOCTOR" && session.user.role !== "PARAVET_WORKER") {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    const requestId = formData.get("requestId") as string;
    const providerId = formData.get("providerId") as string;

    if (!requestId || !providerId) {
      return error("VALIDATION_ERROR", "errors.VALIDATION_ERROR");
    }

    // Verify the requesting user is the provider
    if (providerId !== session.user.id) {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    await markServiceRequestDone(requestId, providerId, session.user.id);

    return success(undefined);
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code as any, `errors.${err.code}`);
    }

    console.error("Mark request done error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}

/**
 * Confirm a service request (by farmer)
 */
export async function confirmRequestAction(
  prevState: ActionResult<void> | null | undefined,
  formData: FormData
): Promise<ActionResult<void>> {
  try {
    const session = await requireSession();
    if (session.user.role !== "FARMER") {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    const requestId = formData.get("requestId") as string;

    if (!requestId) {
      return error("VALIDATION_ERROR", "errors.VALIDATION_ERROR");
    }

    await confirmServiceRequest(requestId, session.user.id, session.user.id);

    return success(undefined);
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code as any, `errors.${err.code}`);
    }

    console.error("Confirm request error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}

/**
 * Dispute a service request (by farmer)
 */
export async function disputeRequestAction(
  prevState: ActionResult<void> | null | undefined,
  formData: FormData
): Promise<ActionResult<void>> {
  try {
    const session = await requireSession();
    if (session.user.role !== "FARMER") {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    const requestId = formData.get("requestId") as string;
    const reason = formData.get("reason") as string;

    if (!requestId || !reason) {
      return error("VALIDATION_ERROR", "errors.VALIDATION_ERROR");
    }

    await disputeServiceRequest(requestId, session.user.id, session.user.id, reason);

    return success(undefined);
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code as any, `errors.${err.code}`);
    }

    console.error("Dispute request error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}

/**
 * Resolve a disputed request (by admin)
 */
export async function resolveDisputeRequestAction(
  prevState: ActionResult<void> | null | undefined,
  formData: FormData
): Promise<ActionResult<void>> {
  try {
    const session = await requireSession();
    if (session.user.role !== "ADMIN") {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    const requestId = formData.get("requestId") as string;
    const resolution = formData.get("resolution") as "COMPLETED" | "CANCELLED";
    const notes = formData.get("notes") as string;

    if (!requestId || !resolution || !notes) {
      return error("VALIDATION_ERROR", "errors.VALIDATION_ERROR");
    }

    await resolveDisputeServiceRequest(requestId, session.user.id, resolution, notes);

    return success(undefined);
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code as any, `errors.${err.code}`);
    }

    console.error("Resolve dispute error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}

/**
 * Cancel a service request
 */
export async function cancelRequestAction(
  prevState: ActionResult<void> | null | undefined,
  formData: FormData
): Promise<ActionResult<void>> {
  try {
    const session = await requireSession();
    const requestId = formData.get("requestId") as string;
    const reason = (formData.get("reason") as string) || "Cancelled by user";

    if (!requestId) {
      return error("VALIDATION_ERROR", "errors.VALIDATION_ERROR");
    }

    await cancelServiceRequest(requestId, session.user.id, session.user.role, reason);

    return success(undefined);
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code as any, `errors.${err.code}`);
    }

    console.error("Cancel request error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}