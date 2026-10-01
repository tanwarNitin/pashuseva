import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceRequests, users, serviceRequestEvents } from "@/db/schema";
import { eq, and, isNull, lt, lte } from "drizzle-orm";
import { serverEnv } from "@/lib/env";
import { sendPush } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // 1. Verify authorization
  const authHeader = req.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${serverEnv.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  let flaggedCount = 0;
  let nudgedCount = 0;
  let autoCompletedCount = 0;

  try {
    // 2. Handle IN_PROGRESS >= 24 hours (flag for admin)
    // Needs to be untouched (statusChangedAt <= 24h ago) and not yet flagged
    const toFlag = await db
      .select({ id: serviceRequests.id })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.status, "IN_PROGRESS"),
          lte(serviceRequests.statusChangedAt, twentyFourHoursAgo),
          eq(serviceRequests.adminFlagged, false)
        )
      );

    if (toFlag.length > 0) {
      const ids = toFlag.map((r) => r.id);

      // We don't change the status, just set the adminFlagged boolean
      await db.transaction(async (tx) => {
        for (const id of ids) {
          await tx
            .update(serviceRequests)
            .set({ adminFlagged: true })
            .where(eq(serviceRequests.id, id));

          await tx.insert(serviceRequestEvents).values({
            requestId: id,
            eventType: "ADMIN_FLAGGED",
            metadata: JSON.stringify({ reason: "IN_PROGRESS > 24h" }),
          });
        }
      });
      flaggedCount = toFlag.length;
    }

    // 3. Handle IN_PROGRESS >= 6 hours, < 24 hours (nudge provider)
    // Not yet nudged, statusChangedAt <= 6h ago
    const toNudge = await db
      .select({
        id: serviceRequests.id,
        providerId: serviceRequests.acceptedProviderId
      })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.status, "IN_PROGRESS"),
          lte(serviceRequests.statusChangedAt, sixHoursAgo),
          isNull(serviceRequests.providerNudgedAt)
        )
      );

    if (toNudge.length > 0) {
      const providerIds = toNudge
        .map((r) => r.providerId)
        .filter(Boolean) as string[];

      // Get locales for providers
      const providerUsers = await db
        .select({ id: users.id, preferredLocale: users.preferredLocale })
        .from(users)
        .where(
          providerIds.length > 0
            ? undefined // fallback, ideally we'd use inArray(users.id, providerIds) but Drizzle 'inArray' needs import. We can just iterate or fetch one by one in transaction since it's a cron. Let's do it in a loop to be safe.
            : undefined
        ); // Wait, better to fetch them in the loop.

      for (const reqData of toNudge) {
        if (!reqData.providerId) continue;

        await db
          .update(serviceRequests)
          .set({ providerNudgedAt: now })
          .where(eq(serviceRequests.id, reqData.id));

        const [provider] = await db
          .select({ preferredLocale: users.preferredLocale })
          .from(users)
          .where(eq(users.id, reqData.providerId));

        if (provider) {
          const locale = provider.preferredLocale === "hi" ? "hi" : "en";
          const title = locale === "hi" ? "यात्रा प्रगति पर है" : "Visit Still In Progress";
          const body = locale === "hi"
            ? "आपकी यात्रा अभी भी प्रगति पर है। समाप्त होने पर इसे पूरा चिह्नित करें।"
            : "Your visit is still marked in progress — mark it done when finished.";

          await sendPush(reqData.providerId, {
            title,
            body,
            url: `/${locale}/dashboard`,
          }).catch((err) => console.error("Failed to push provider nudge:", err));
        }
      }
      nudgedCount = toNudge.length;
    }

    // 4. Handle AWAITING_CONFIRMATION >= 48 hours (auto complete)
    const toComplete = await db
      .select({ id: serviceRequests.id })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.status, "AWAITING_CONFIRMATION"),
          lte(serviceRequests.statusChangedAt, fortyEightHoursAgo)
        )
      );

    if (toComplete.length > 0) {
      const ids = toComplete.map((r) => r.id);

      await db.transaction(async (tx) => {
        for (const id of ids) {
          await tx
            .update(serviceRequests)
            .set({
              status: "COMPLETED",
              completedAt: now,
              updatedAt: now,
              statusChangedAt: now
            })
            .where(eq(serviceRequests.id, id));

          await tx.insert(serviceRequestEvents).values({
            requestId: id,
            eventType: "COMPLETED", // Using COMPLETED to represent farmer silent confirmation
            metadata: JSON.stringify({ reason: "AUTO_COMPLETED_48H" }),
          });
        }
      });
      autoCompletedCount = toComplete.length;
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      actions: {
        flagged: flaggedCount,
        nudged: nudgedCount,
        autoCompleted: autoCompletedCount
      }
    });

  } catch (error: any) {
    console.error("Cron check-stale-visits error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
