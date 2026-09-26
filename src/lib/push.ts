import webPush from "web-push";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { serverEnv, publicEnv } from "./env";

webPush.setVapidDetails(
  serverEnv.VAPID_SUBJECT,
  publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  serverEnv.VAPID_PRIVATE_KEY
);

export async function sendPush(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subscriptions.length === 0) return;

  const payloadString = JSON.stringify(payload);

  const promises = subscriptions.map(async (sub) => {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payloadString
      );
    } catch (error: any) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        // Subscription has expired or is no longer valid
        console.log("Subscription has expired or is invalid. Deleting...", sub.endpoint);
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.endpoint, sub.endpoint));
      } else {
        console.error("Error sending push notification:", error);
      }
    }
  });

  await Promise.all(promises);
}
