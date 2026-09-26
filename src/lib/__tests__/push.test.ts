import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import webPush from "web-push";
import { db } from "@/db";

// Mock environment variables to prevent initialization errors
vi.mock("@/lib/env", () => ({
  serverEnv: {
    VAPID_SUBJECT: "mailto:test@example.com",
    VAPID_PRIVATE_KEY: "private-key",
  },
  publicEnv: {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public-key",
  },
}));

vi.mock("web-push", () => {
  return {
    default: {
      setVapidDetails: vi.fn(),
      sendNotification: vi.fn(),
    },
  };
});

// Mock the DB client
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    delete: vi.fn(),
  },
}));

import { sendPush } from "../push";

describe("sendPush utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fans out to all of a user's subscriptions with the right payload", async () => {
    const mockSubscriptions = [
      { endpoint: "https://push1", p256dh: "key1", auth: "auth1" },
      { endpoint: "https://push2", p256dh: "key2", auth: "auth2" },
    ];

    // Setup db.select chain mock
    const whereMock = vi.fn().mockResolvedValue(mockSubscriptions);
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    vi.mocked(db.select).mockReturnValue({ from: fromMock } as any);

    await sendPush("user-123", { title: "Hello", body: "World" });

    expect(webPush.sendNotification).toHaveBeenCalledTimes(2);
    expect(webPush.sendNotification).toHaveBeenCalledWith(
      { endpoint: "https://push1", keys: { p256dh: "key1", auth: "auth1" } },
      JSON.stringify({ title: "Hello", body: "World" })
    );
    expect(webPush.sendNotification).toHaveBeenCalledWith(
      { endpoint: "https://push2", keys: { p256dh: "key2", auth: "auth2" } },
      JSON.stringify({ title: "Hello", body: "World" })
    );
  });

  it("deletes subscription row on 410/404 response", async () => {
    const mockSubscriptions = [
      { endpoint: "https://push-expired", p256dh: "key1", auth: "auth1" },
    ];

    // Setup db.select chain mock
    const whereSelectMock = vi.fn().mockResolvedValue(mockSubscriptions);
    const fromMock = vi.fn().mockReturnValue({ where: whereSelectMock });
    vi.mocked(db.select).mockReturnValue({ from: fromMock } as any);

    // Setup db.delete chain mock
    const whereDeleteMock = vi.fn().mockResolvedValue([]);
    vi.mocked(db.delete).mockReturnValue({ where: whereDeleteMock } as any);

    // Mock sendNotification to throw a 410 error
    vi.mocked(webPush.sendNotification).mockRejectedValue({ statusCode: 410 });

    await sendPush("user-123", { title: "Hello", body: "World" });

    // It should have attempted to send
    expect(webPush.sendNotification).toHaveBeenCalledTimes(1);

    // It should have called db.delete
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(whereDeleteMock).toHaveBeenCalledTimes(1);
  });
});
