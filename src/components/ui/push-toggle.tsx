"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeToPushAction, unsubscribeFromPushAction } from "@/actions/push.actions";
import { publicEnv } from "@/lib/env";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushToggle({ 
  labelSubscribe = "Enable Notifications",
  labelUnsubscribe = "Disable Notifications",
  labelDenied = "Notifications Blocked"
}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      checkSubscription();
    } else {
      setIsLoading(false);
    }
  }, []);

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (e) {
      console.error("Service Worker registration failed", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggle() {
    setIsLoading(true);
    try {
      if (permission === "default") {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") {
          setIsLoading(false);
          return;
        }
      }

      const registration = await navigator.serviceWorker.ready;

      if (isSubscribed) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await unsubscribeFromPushAction(subscription.endpoint);
        }
        setIsSubscribed(false);
      } else {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          ),
        });

        const subJson = JSON.parse(JSON.stringify(subscription));

        await subscribeToPushAction({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        });

        setIsSubscribed(true);
      }
    } catch (error) {
      console.error("Error toggling push subscription", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isSupported) return null;

  if (permission === "denied") {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2 text-muted-foreground">
        <BellOff className="h-4 w-4" />
        {labelDenied}
      </Button>
    );
  }

  return (
    <Button
      variant={isSubscribed ? "default" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      {isSubscribed ? labelUnsubscribe : labelSubscribe}
    </Button>
  );
}
