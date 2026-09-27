// import "server-only";
import { db } from "@/db";
import { serviceRequests, serviceRequestRecipients, providerProfiles, users, animals, serviceRequestEvents } from "@/db/schema";
import { eq, and, ne, sql, desc } from "drizzle-orm";
import { ConflictError, AuthenticationError, ValidationError } from "@/lib/errors";
import { checkApiRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { calculateFee, type FeeBreakdown } from "@/lib/fees";
import { discoverNearbyProviders } from "@/services/discovery.service";

export type CreateRequestInput = {
  farmerId: string;
  animalId?: string;
  kind: "SOS" | "ROUTINE";
  serviceCode: string;
  conditionSummary: string;
  latitude: string;
  longitude: string;
  locationSource: string;
  locationAccuracyM?: string;
  locationDescription?: string;
  scheduledFor?: Date;
  expiresAt: Date;
  clientRequestId: string;
  idempotencyPayloadHash: string;
};

export type RequestWithDetails = {
  id: string;
  animalId: string | null;
  farmerId: string;
  kind: "SOS" | "ROUTINE";
  serviceCode: string;
  status: string;
  conditionSummary: string;
  latitude: string;
  longitude: string;
  locationSource: string;
  locationDescription: string | null;
  scheduledFor: Date | null;
  expiresAt: Date;
  acceptedProviderId: string | null;
  createdAt: Date;
  farmerName: string;
  farmerPhone: string;
  animalTagId: string | null;
  animalName: string | null;
  distanceMeters?: number;
  estimatedTotalPaise?: number;
  offerStatus?: string;
};


/**
 * Create a new service request
 */
export async function createServiceRequest(
  input: CreateRequestInput,
  requestingUserId: string
): Promise<{ id: string }> {
  // Validate input
  if (input.farmerId !== requestingUserId) {
    throw new AuthenticationError("You can only create requests for yourself");
  }

  // Verify farmer exists and is active
  const [farmer] = await db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(eq(users.id, input.farmerId))
    .limit(1);

  if (!farmer) {
    throw new ValidationError("Farmer not found");
  }

  if (farmer.status !== "ACTIVE") {
    throw new ValidationError("Farmer account is not active");
  }

  // Rate limit the request
  await checkApiRateLimit(requestingUserId);

  // Create the service request
  const [request] = await db
    .insert(serviceRequests)
    .values({
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
      scheduledFor: input.scheduledFor,
      expiresAt: input.expiresAt,
      status: "OPEN",
      clientRequestId: input.clientRequestId,
      idempotencyPayloadHash: input.idempotencyPayloadHash,
    })
    .returning({ id: serviceRequests.id });

  // Reset rate limit on successful request
  await resetRateLimit(requestingUserId);

  // Record creation event
  await db.insert(serviceRequestEvents).values({
    requestId: request.id,
    actorUserId: requestingUserId,
    eventType: "CREATED",
    metadata: JSON.stringify({ kind: input.kind, serviceCode: input.serviceCode })
  });

  // If this is an SOS request, perform matching and broadcast offers
  if (input.kind === "SOS") {
    try {
      const nearbyProviders = await discoverNearbyProviders({
        latitude: parseFloat(input.latitude),
        longitude: parseFloat(input.longitude),
      }, {
        requestType: input.kind
      });

      if (nearbyProviders.length > 0) {
        // Create recipients
        const recipientsToInsert = nearbyProviders.map(provider => ({
          requestId: request.id,
          providerId: provider.userId,
          offerStatus: "PENDING",
          distanceMSnapshot: provider.distanceMeters ?? 0,
          baseVisitFeePaiseSnapshot: provider.baseVisitFeePaise,
          perKmFeePaiseSnapshot: provider.perKmFeePaise,
          estimatedTotalPaiseSnapshot: provider.feeBreakdown?.totalFeePaise ?? provider.baseVisitFeePaise,
        }));

        await db.insert(serviceRequestRecipients).values(recipientsToInsert);

        // Create OFFER_SENT events
        const offerEvents = nearbyProviders.map(provider => ({
          requestId: request.id,
          actorUserId: null, // Automated system action
          eventType: "OFFER_SENT",
          metadata: JSON.stringify({ providerId: provider.userId })
        }));

        await db.insert(serviceRequestEvents).values(offerEvents);

        try {
          const { sendPush } = await import("@/lib/push");
          await Promise.all(nearbyProviders.map(async (provider) => {
            const [user] = await db.select({ preferredLocale: users.preferredLocale }).from(users).where(eq(users.id, provider.userId));
            const locale = user?.preferredLocale === "hi" ? "hi" : "en";
            return sendPush(provider.userId, {
              title: locale === "hi" ? "आसपास नया आपातकालीन अनुरोध" : "New emergency request nearby",
              body: locale === "hi" ? "एक किसान को तत्काल सहायता की आवश्यकता है। देखने के लिए टैप करें।" : "A farmer needs urgent assistance. Tap to view.",
              url: `/${locale}/dashboard`,
            });
          }));
        } catch (e) {
          console.error("Failed to send push to providers", e);
        }
      }
    } catch (err) {
      console.error("Failed to broadcast SOS to providers:", err);
      // We don't fail the request creation if broadcast fails
    }
  }

  return { id: request.id };
}


/**
 * Get service requests for a farmer
 */
export async function getFarmerRequests(
  farmerId: string,
  requestingUserId: string
): Promise<RequestWithDetails[]> {
  if (farmerId !== requestingUserId) {
    throw new AuthenticationError("You can only view your own requests");
  }

  const requests = await db
    .select({
      id: serviceRequests.id,
      animalId: serviceRequests.animalId,
      farmerId: serviceRequests.farmerId,
      kind: serviceRequests.kind,
      serviceCode: serviceRequests.serviceCode,
      conditionSummary: serviceRequests.conditionSummary,
      status: serviceRequests.status,
      latitude: serviceRequests.latitude,
      longitude: serviceRequests.longitude,
      locationSource: serviceRequests.locationSource,
      locationDescription: serviceRequests.locationDescription,
      scheduledFor: serviceRequests.scheduledFor,
      expiresAt: serviceRequests.expiresAt,
      acceptedProviderId: serviceRequests.acceptedProviderId,
      createdAt: serviceRequests.createdAt,
      farmerName: users.name,
      farmerPhone: users.phone,
      animalTagId: animals.tagId,
      animalName: animals.name,
    })
    .from(serviceRequests)
    .innerJoin(users, eq(serviceRequests.farmerId, users.id))
    .leftJoin(animals, eq(serviceRequests.animalId, animals.id))
    .where(eq(serviceRequests.farmerId, farmerId))
    .orderBy(desc(serviceRequests.createdAt));

  return requests.map((request) => ({
    id: request.id,
    animalId: request.animalId,
    farmerId: request.farmerId,
    kind: request.kind as "SOS" | "ROUTINE",
    serviceCode: request.serviceCode,
    conditionSummary: request.conditionSummary,
    status: request.status,
    latitude: request.latitude,
    longitude: request.longitude,
    locationSource: request.locationSource,
    locationDescription: request.locationDescription,
    scheduledFor: request.scheduledFor,
    expiresAt: request.expiresAt,
    acceptedProviderId: request.acceptedProviderId,
    createdAt: request.createdAt,
    farmerName: request.farmerName,
    farmerPhone: request.farmerPhone,
    animalTagId: request.animalTagId ?? null,
    animalName: request.animalName ?? null,
  }));
}

export type FarmerRequestDetails = Omit<RequestWithDetails, 'estimatedTotalPaise'> & {
  providerName: string | null;
  providerPhone: string | null;
  estimatedTotalPaise: number | null;
};

export async function getFarmerRequestDetails(
  requestId: string,
  farmerId: string
): Promise<FarmerRequestDetails> {
  const [request] = await db
    .select({
      id: serviceRequests.id,
      animalId: serviceRequests.animalId,
      farmerId: serviceRequests.farmerId,
      kind: serviceRequests.kind,
      serviceCode: serviceRequests.serviceCode,
      conditionSummary: serviceRequests.conditionSummary,
      status: serviceRequests.status,
      latitude: serviceRequests.latitude,
      longitude: serviceRequests.longitude,
      locationSource: serviceRequests.locationSource,
      locationDescription: serviceRequests.locationDescription,
      scheduledFor: serviceRequests.scheduledFor,
      expiresAt: serviceRequests.expiresAt,
      acceptedProviderId: serviceRequests.acceptedProviderId,
      createdAt: serviceRequests.createdAt,
      farmerName: users.name,
      farmerPhone: users.phone,
      animalTagId: animals.tagId,
      animalName: animals.name,
    })
    .from(serviceRequests)
    .innerJoin(users, eq(serviceRequests.farmerId, users.id))
    .leftJoin(animals, eq(serviceRequests.animalId, animals.id))
    .where(and(eq(serviceRequests.id, requestId), eq(serviceRequests.farmerId, farmerId)))
    .limit(1);

  if (!request) {
    throw new ValidationError("Request not found");
  }

  let providerName = null;
  let providerPhone = null;
  let estimatedTotalPaise = null;

  if (request.acceptedProviderId) {
    const [provider] = await db
      .select({ name: users.name, phone: users.phone })
      .from(users)
      .where(eq(users.id, request.acceptedProviderId))
      .limit(1);
    
    if (provider) {
      providerName = provider.name;
      providerPhone = provider.phone;
    }

    const [recipient] = await db
      .select({ estimatedTotalPaiseSnapshot: serviceRequestRecipients.estimatedTotalPaiseSnapshot })
      .from(serviceRequestRecipients)
      .where(and(
        eq(serviceRequestRecipients.requestId, requestId),
        eq(serviceRequestRecipients.providerId, request.acceptedProviderId)
      ))
      .limit(1);
    
    if (recipient) {
      estimatedTotalPaise = recipient.estimatedTotalPaiseSnapshot;
    }
  }

  return {
    ...request,
    kind: request.kind as "SOS" | "ROUTINE",
    providerName,
    providerPhone,
    estimatedTotalPaise,
  };
}

/**
 * Get service requests for a provider
 */
export async function getProviderRequests(
  providerId: string,
  requestingUserId: string
): Promise<RequestWithDetails[]> {
  // Verify the requesting user is a provider
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, requestingUserId))
    .limit(1);

  if (!user || (user.role !== "VET_DOCTOR" && user.role !== "PARAVET_WORKER")) {
    throw new AuthenticationError("You must be a provider to view provider requests");
  }

  // Verify provider profile exists
  const [provider] = await db
    .select({ userId: providerProfiles.userId })
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, requestingUserId))
    .limit(1);

  if (!provider) {
    throw new ValidationError("Provider profile not found");
  }

  // Get OPEN requests (incoming feed) plus requests assigned to this provider
  const requests = await db
    .select({
      id: serviceRequests.id,
      animalId: serviceRequests.animalId,
      farmerId: serviceRequests.farmerId,
      kind: serviceRequests.kind,
      serviceCode: serviceRequests.serviceCode,
      conditionSummary: serviceRequests.conditionSummary,
      status: serviceRequests.status,
      offerStatus: serviceRequestRecipients.offerStatus,
      latitude: serviceRequests.latitude,
      longitude: serviceRequests.longitude,
      locationSource: serviceRequests.locationSource,
      locationDescription: serviceRequests.locationDescription,
      scheduledFor: serviceRequests.scheduledFor,
      expiresAt: serviceRequests.expiresAt,
      acceptedProviderId: serviceRequests.acceptedProviderId,
      createdAt: serviceRequests.createdAt,
      farmerName: users.name,
      farmerPhone: users.phone,
      distanceMeters: serviceRequestRecipients.distanceMSnapshot,
      estimatedTotalPaise: serviceRequestRecipients.estimatedTotalPaiseSnapshot
    })
    .from(serviceRequests)
    .innerJoin(users, eq(serviceRequests.farmerId, users.id))
    .innerJoin(serviceRequestRecipients, and(
      eq(serviceRequests.id, serviceRequestRecipients.requestId),
      eq(serviceRequestRecipients.providerId, requestingUserId)
    ))
    .where(
      and(
        sql`${serviceRequests.status} IN ('OPEN', 'ACCEPTED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'DISPUTED')`,
        sql`(${serviceRequests.status} != 'OPEN' OR ${serviceRequests.expiresAt} > NOW())`,
        sql`(${serviceRequestRecipients.offerStatus} = 'PENDING' OR ${serviceRequests.acceptedProviderId} = ${requestingUserId})`,
        eq(users.status, "ACTIVE")
      )
    )
    .orderBy(
      sql`CASE WHEN ${serviceRequests.status} = 'OPEN' THEN 0 WHEN ${serviceRequests.status} = 'ACCEPTED' THEN 1 ELSE 2 END`,
      desc(serviceRequests.createdAt)
    );

  return requests.map((request) => ({
    id: request.id,
    animalId: request.animalId,
    farmerId: request.farmerId,
    kind: request.kind as "SOS" | "ROUTINE",
    serviceCode: request.serviceCode,
    conditionSummary: request.conditionSummary,
    status: request.status,
    offerStatus: request.offerStatus,
    latitude: request.latitude,
    longitude: request.longitude,
    locationSource: request.locationSource,
    locationDescription: request.locationDescription,
    scheduledFor: request.scheduledFor,
    expiresAt: request.expiresAt,
    acceptedProviderId: request.acceptedProviderId,
    createdAt: request.createdAt,
    farmerName: request.farmerName,
    farmerPhone: request.farmerPhone,
    animalTagId: null,
    animalName: null,
    distanceMeters: request.distanceMeters,
    estimatedTotalPaise: request.estimatedTotalPaise
  }));
}

/**
 * Get all disputed requests (for admin)
 */
export async function getDisputedRequests(
  requestingUserId: string
) {
  // Verify user is admin
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, requestingUserId))
    .limit(1);

  if (!user || user.role !== "ADMIN") {
    throw new AuthenticationError("You must be an admin to view disputes");
  }

  const disputed = await db
    .select({
      id: serviceRequests.id,
      kind: serviceRequests.kind,
      serviceCode: serviceRequests.serviceCode,
      status: serviceRequests.status,
      createdAt: serviceRequests.createdAt,
      farmerId: serviceRequests.farmerId,
      farmerName: users.name,
      farmerPhone: users.phone,
      providerId: serviceRequests.acceptedProviderId,
    })
    .from(serviceRequests)
    .innerJoin(users, eq(serviceRequests.farmerId, users.id))
    .where(eq(serviceRequests.status, "DISPUTED"))
    .orderBy(desc(serviceRequests.updatedAt));

  return disputed;
}

/**
 * Accept a service request (provider responds)
 */
export async function acceptServiceRequest(
  requestId: string,
  providerId: string,
  requestingUserId: string
): Promise<void> {
  // Verify the requesting user is the provider
  if (providerId !== requestingUserId) {
    throw new AuthenticationError("You can only accept requests for yourself");
  }

  // Verify provider exists and is verified
  const [provider] = await db
    .select({
      userId: providerProfiles.userId,
      verificationStatus: providerProfiles.verificationStatus,
    })
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, providerId))
    .limit(1);

  if (!provider) {
    throw new ValidationError("Provider profile not found");
  }

  if (provider.verificationStatus !== "VERIFIED") {
    throw new ValidationError("Only verified providers can accept requests");
  }

  // Check if request is OPEN and not expired
  const [request] = await db
    .select({
      status: serviceRequests.status,
      expiresAt: serviceRequests.expiresAt,
      acceptedProviderId: serviceRequests.acceptedProviderId,
      farmerId: serviceRequests.farmerId,
    })
    .from(serviceRequests)
    .where(eq(serviceRequests.id, requestId))
    .limit(1);

  if (!request) {
    throw new ValidationError("Request not found");
  }

  // Idempotent acceptance for already accepted provider
  if (request.status === "ACCEPTED" && request.acceptedProviderId === providerId) {
    return;
  }
  
  if (request.status !== "OPEN") {
    throw new ConflictError(`Cannot accept request in status ${request.status}`);
  }

  if (request.expiresAt < new Date()) {
    throw new ConflictError("This request has expired");
  }

  // Execute acceptance transaction
  await db.transaction(async (tx) => {
    // 1. Update the request status atomically
    const result = await tx
      .update(serviceRequests)
      .set({
        status: "ACCEPTED",
        acceptedProviderId: providerId,
        acceptedAt: new Date(),
        updatedAt: new Date(),
        statusChangedAt: new Date(),
      })
      .where(
        and(
          eq(serviceRequests.id, requestId),
          eq(serviceRequests.status, "OPEN")
        )
      );
      
    if (result.rowCount === 0) {
      throw new ConflictError("Request could not be accepted. It may have been accepted by someone else or cancelled.");
    }

    // 2. Mark winning recipient as ACCEPTED
    await tx
      .update(serviceRequestRecipients)
      .set({
        offerStatus: "ACCEPTED",
        respondedAt: new Date(),
      })
      .where(
        and(
          eq(serviceRequestRecipients.requestId, requestId),
          eq(serviceRequestRecipients.providerId, providerId)
        )
      );

    // 3. Mark other pending offers as WITHDRAWN
    await tx
      .update(serviceRequestRecipients)
      .set({
        offerStatus: "WITHDRAWN",
      })
      .where(
        and(
          eq(serviceRequestRecipients.requestId, requestId),
          ne(serviceRequestRecipients.providerId, providerId),
          eq(serviceRequestRecipients.offerStatus, "PENDING")
        )
      );

    // 4. Record acceptance event
    await tx.insert(serviceRequestEvents).values({
      requestId,
      actorUserId: requestingUserId,
      eventType: "ACCEPTED"
    });
  });

  try {
    const { sendPush } = await import("@/lib/push");
    const [user] = await db.select({ preferredLocale: users.preferredLocale }).from(users).where(eq(users.id, request.farmerId));
    const locale = user?.preferredLocale === "hi" ? "hi" : "en";
    await sendPush(request.farmerId, {
      title: locale === "hi" ? "आपका पशु चिकित्सक रास्ते में है" : "Your vet is on the way",
      body: locale === "hi" ? "एक प्रदाता ने आपके आपातकालीन अनुरोध को स्वीकार कर लिया है।" : "A provider has accepted your emergency request.",
      url: `/${locale}/requests`,
    });
  } catch (e) {
    console.error("Failed to send push to farmer", e);
  }
}

/**
 * Decline a service request (provider rejects offer in recipients table)
 */
export async function declineServiceRequest(
  requestId: string,
  providerId: string,
  requestingUserId: string,
  reason: string
): Promise<void> {
  // Verify the requesting user is the provider
  if (providerId !== requestingUserId) {
    throw new AuthenticationError("You can only decline requests for yourself");
  }

  // Update the recipient offer status (if recipient record exists)
  await db
    .update(serviceRequestRecipients)
    .set({
      offerStatus: "DECLINED",
      respondedAt: new Date(),
    })
    .where(
      and(
        eq(serviceRequestRecipients.requestId, requestId),
        eq(serviceRequestRecipients.providerId, providerId)
      )
    );

  // Record decline event
  await db.insert(serviceRequestEvents).values({
    requestId,
    actorUserId: requestingUserId,
    eventType: "DECLINED"
  });
}

/**
 * Start a service request (Provider arrived / started work)
 */
export async function startServiceRequest(
  requestId: string,
  providerId: string,
  requestingUserId: string
): Promise<void> {
  if (providerId !== requestingUserId) {
    throw new AuthenticationError("You can only start requests for yourself");
  }

  const result = await db
    .update(serviceRequests)
    .set({
      status: "IN_PROGRESS",
      startedAt: new Date(),
      updatedAt: new Date(),
      statusChangedAt: new Date(),
    })
    .where(
      and(
        eq(serviceRequests.id, requestId),
        eq(serviceRequests.status, "ACCEPTED"),
        eq(serviceRequests.acceptedProviderId, providerId)
      )
    );

  if (result.rowCount === 0) {
    throw new ConflictError("Request could not be started. Ensure it is ACCEPTED and assigned to you.");
  }

  await db.insert(serviceRequestEvents).values({
    requestId,
    actorUserId: requestingUserId,
    eventType: "STARTED"
  });
}

/**
 * Mark a service request as done (by provider) - now AWAITING_CONFIRMATION
 */
export async function markServiceRequestDone(
  requestId: string,
  providerId: string,
  requestingUserId: string
): Promise<void> {
  if (providerId !== requestingUserId) {
    throw new AuthenticationError("You can only mark requests done for yourself");
  }

  const [request] = await db.select({ farmerId: serviceRequests.farmerId }).from(serviceRequests).where(eq(serviceRequests.id, requestId));
  
  if (!request) {
    throw new ValidationError("Request not found");
  }

  const result = await db
    .update(serviceRequests)
    .set({
      status: "AWAITING_CONFIRMATION",
      updatedAt: new Date(),
      statusChangedAt: new Date(),
    })
    .where(
      and(
        eq(serviceRequests.id, requestId),
        eq(serviceRequests.status, "IN_PROGRESS"),
        eq(serviceRequests.acceptedProviderId, providerId)
      )
    );

  if (result.rowCount === 0) {
    throw new ConflictError("Request could not be marked done. Ensure it is IN_PROGRESS and assigned to you.");
  }

  await db.insert(serviceRequestEvents).values({
    requestId,
    actorUserId: requestingUserId,
    eventType: "MARKED_DONE"
  });

  try {
    const { sendPush } = await import("@/lib/push");
    const [user] = await db.select({ preferredLocale: users.preferredLocale }).from(users).where(eq(users.id, request.farmerId));
    const locale = user?.preferredLocale === "hi" ? "hi" : "en";
    await sendPush(request.farmerId, {
      title: locale === "hi" ? "क्या आपका दौरा हुआ?" : "Did your visit happen?",
      body: locale === "hi" ? "अपने अनुरोध की पुष्टि करें या विवाद दर्ज करें।" : "Confirm or dispute your request.",
      url: `/${locale}/requests/${requestId}`,
    });
  } catch (e) {
    console.error("Failed to send push to farmer", e);
  }
}

/**
 * Confirm a service request (by farmer)
 */
export async function confirmServiceRequest(
  requestId: string,
  farmerId: string,
  requestingUserId: string
): Promise<void> {
  if (farmerId !== requestingUserId) {
    throw new AuthenticationError("You can only confirm requests for yourself");
  }

  const result = await db
    .update(serviceRequests)
    .set({
      status: "COMPLETED",
      completedAt: new Date(),
      updatedAt: new Date(),
      statusChangedAt: new Date(),
    })
    .where(
      and(
        eq(serviceRequests.id, requestId),
        eq(serviceRequests.status, "AWAITING_CONFIRMATION"),
        eq(serviceRequests.farmerId, farmerId)
      )
    );

  if (result.rowCount === 0) {
    throw new ConflictError("Request could not be confirmed. Ensure it is AWAITING_CONFIRMATION and belongs to you.");
  }

  await db.insert(serviceRequestEvents).values({
    requestId,
    actorUserId: requestingUserId,
    eventType: "CONFIRMED"
  });
}

/**
 * Dispute a service request (by farmer)
 */
export async function disputeServiceRequest(
  requestId: string,
  farmerId: string,
  requestingUserId: string,
  reason: string
): Promise<void> {
  if (farmerId !== requestingUserId) {
    throw new AuthenticationError("You can only dispute requests for yourself");
  }

  if (!reason || reason.trim() === "") {
    throw new ValidationError("Reason is required for dispute");
  }

  const result = await db
    .update(serviceRequests)
    .set({
      status: "DISPUTED",
      updatedAt: new Date(),
      statusChangedAt: new Date(),
    })
    .where(
      and(
        eq(serviceRequests.id, requestId),
        eq(serviceRequests.status, "AWAITING_CONFIRMATION"),
        eq(serviceRequests.farmerId, farmerId)
      )
    );

  if (result.rowCount === 0) {
    throw new ConflictError("Request could not be disputed. Ensure it is AWAITING_CONFIRMATION and belongs to you.");
  }

  await db.insert(serviceRequestEvents).values({
    requestId,
    actorUserId: requestingUserId,
    eventType: "DISPUTED",
    metadata: JSON.stringify({ reason })
  });

  // Notify admins
  try {
    const { sendPush } = await import("@/lib/push");
    const admins = await db.select({ id: users.id, preferredLocale: users.preferredLocale }).from(users).where(eq(users.role, "ADMIN"));
    await Promise.all(admins.map(async (admin) => {
      const locale = admin.preferredLocale === "hi" ? "hi" : "en";
      return sendPush(admin.id, {
        title: locale === "hi" ? "नया विवाद दर्ज किया गया" : "New Dispute Filed",
        body: locale === "hi" ? "एक किसान ने यात्रा पर विवाद किया है। समीक्षा के लिए टैप करें।" : "A farmer disputed a visit. Tap to review.",
        url: `/${locale}/admin/disputes`,
      });
    }));
  } catch (e) {
    console.error("Failed to send push to admins", e);
  }
}

/**
 * Resolve a disputed service request (by admin)
 */
export async function resolveDisputeServiceRequest(
  requestId: string,
  adminId: string,
  resolution: "COMPLETED" | "CANCELLED",
  notes: string
): Promise<void> {
  const [admin] = await db.select({ role: users.role }).from(users).where(eq(users.id, adminId));
  
  if (!admin || admin.role !== "ADMIN") {
    throw new AuthenticationError("Only admins can resolve disputes");
  }

  const result = await db
    .update(serviceRequests)
    .set({
      status: resolution,
      ...(resolution === "COMPLETED" ? { completedAt: new Date() } : { cancelledAt: new Date(), cancellationReason: "Admin Resolution: " + notes }),
      updatedAt: new Date(),
      statusChangedAt: new Date(),
    })
    .where(
      and(
        eq(serviceRequests.id, requestId),
        eq(serviceRequests.status, "DISPUTED")
      )
    );

  if (result.rowCount === 0) {
    throw new ConflictError("Request could not be resolved. Ensure it is DISPUTED.");
  }

  await db.insert(serviceRequestEvents).values({
    requestId,
    actorUserId: adminId,
    eventType: resolution === "COMPLETED" ? "RESOLVED_COMPLETED" : "RESOLVED_CANCELLED",
    metadata: JSON.stringify({ notes })
  });
}

/**
 * Cancel a service request
 */
export async function cancelServiceRequest(
  requestId: string,
  userId: string,
  userRole: string,
  reason: string
): Promise<void> {
  // First, find the request to verify ownership and current status
  const [request] = await db
    .select({ 
      farmerId: serviceRequests.farmerId, 
      acceptedProviderId: serviceRequests.acceptedProviderId,
      status: serviceRequests.status 
    })
    .from(serviceRequests)
    .where(eq(serviceRequests.id, requestId))
    .limit(1);

  if (!request) {
    throw new ValidationError("Request not found");
  }

  // Check terminal state
  if (["COMPLETED", "CANCELLED", "EXPIRED"].includes(request.status)) {
    throw new ConflictError(`Cannot cancel request in status ${request.status}`);
  }

  // Authorization check
  if (userRole === "FARMER") {
    if (request.farmerId !== userId) {
      throw new AuthenticationError("You can only cancel your own requests");
    }
  } else if (["VET_DOCTOR", "PARAVET_WORKER"].includes(userRole)) {
    // Provider can only cancel if they are assigned
    if (request.acceptedProviderId !== userId) {
      throw new AuthenticationError("You can only cancel a request you have accepted");
    }
  } else {
    throw new AuthenticationError("Invalid role for cancellation");
  }

  const result = await db
    .update(serviceRequests)
    .set({
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: reason,
      updatedAt: new Date(),
      statusChangedAt: new Date(),
    })
    .where(eq(serviceRequests.id, requestId));

  if (result.rowCount === 0) {
    throw new ConflictError("Cancellation failed");
  }

  await db.insert(serviceRequestEvents).values({
    requestId,
    actorUserId: userId,
    eventType: "CANCELLED",
    metadata: JSON.stringify({ reason })
  });
}

/**
 * Cron-like utility to expire requests that have passed their expiresAt time
 * This forcefully transitions OPEN -> EXPIRED
 */
export async function expireServiceRequests(): Promise<number> {
  // Find requests to expire
  const toExpire = await db
    .select({ id: serviceRequests.id })
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.status, "OPEN"),
        sql`${serviceRequests.expiresAt} < NOW()`
      )
    );
    
  if (toExpire.length === 0) {
    return 0;
  }
  
  const ids = toExpire.map(r => r.id);
  
  await db
    .update(serviceRequests)
    .set({
      status: "EXPIRED",
      updatedAt: new Date(),
      statusChangedAt: new Date(),
    })
    .where(
      and(
        eq(serviceRequests.status, "OPEN"),
        sql`${serviceRequests.expiresAt} < NOW()`
      )
    );
    
  // Record events
  const events = ids.map(id => ({
    requestId: id,
    actorUserId: null, // automated
    eventType: "EXPIRED",
  }));
  
  await db.insert(serviceRequestEvents).values(events);
  
  return ids.length;
}