"use strict";
"use server";

import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";

export async function subscribeToPushAction(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  try {
    const session = await requireSession();

    await db.insert(pushSubscriptions).values({
      userId: session.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    }).onConflictDoUpdate({
      target: [pushSubscriptions.endpoint],
      set: {
        userId: session.user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }
    });

    return { ok: true };
  } catch (error) {
    console.error("Failed to subscribe to push notifications:", error);
    return { ok: false, error: "Failed to subscribe" };
  }
}

export async function unsubscribeFromPushAction(endpoint: string) {
  try {
    const session = await requireSession();

    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));

    return { ok: true };
  } catch (error) {
    console.error("Failed to unsubscribe from push notifications:", error);
    return { ok: false, error: "Failed to unsubscribe" };
  }
}
