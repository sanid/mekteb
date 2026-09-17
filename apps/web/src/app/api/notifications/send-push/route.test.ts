import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A fluent mock for the supabase query builder. Each call returns the same
 * chain object, which resolves to `result` only when the awaited promise is
 * reached via `.then` (awaiting the chain). The route builds:
 *   from().select().is().eq().gt().order().limit()   (cron batch)
 *   from().select().is().eq().eq().limit()           (single notification)
 */
function queryChain(result: unknown, tables: Record<string, () => unknown>) {
  const chain = Object.assign(
    (() => {
      throw new Error("chain not awaited");
    }) as unknown as Promise<unknown>,
    {
      select: vi.fn(() => chain),
      is: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      gt: vi.fn(() => chain),
      order: vi.fn(() => chain),
      in: vi.fn(() => chain),
      limit: vi.fn(() => Promise.resolve(result as never)),
      then: (onF: unknown, onR: unknown) =>
        Promise.resolve(result as never).then(onF as never, onR as never),
    },
  );
  void tables;
  return chain;
}

const mockedAdmin = vi.hoisted(() => ({
  from: vi.fn(),
  auth: { admin: { listUsers: vi.fn() } },
}));

vi.mock("@/lib/format", () => ({
  formatDate: (value: string) => value,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockedAdmin,
}));

vi.mock("@/lib/push/apns", () => ({
  sendApns: vi.fn(),
}));

vi.mock("@/lib/push/fcm", () => ({
  sendFcm: vi.fn(),
}));

import { sendApns } from "@/lib/push/apns";
import { sendFcm } from "@/lib/push/fcm";
import { POST } from "@/app/api/notifications/send-push/route";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "n1",
    recipient_profile_id: "u1",
    subject: null,
    body: "Hausaufgabe fällig",
    created_at: new Date().toISOString(),
    template_key: null,
    template_params: null,
    source_message_id: null,
    source_announcement_id: null,
    thread_id: null,
    messages: null,
    ...overrides,
  };
}

const now = new Date().toISOString();

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "cron-secret");
  vi.stubEnv("PUSH_WEBHOOK_SECRET", "webhook-secret");
  vi.clearAllMocks();
});

/** Sets up the admin client so notification_queue fetches return `rows`. */
function queueFetches(rows: unknown[]) {
  // `.update(payload)` records the call and returns `{ eq(id) -> promise }`,
  // mirroring the real builder the route uses.
  const updateFn = vi.fn((_payload: Record<string, unknown>) => ({
    eq: vi.fn(() => Promise.resolve({ error: null })),
  }));
  mockedAdmin.from.mockImplementation((table: string) => {
    if (table === "notification_queue") {
      return Object.assign(queryChain({ data: rows, error: null }, {}), {
        update: updateFn,
      });
    }
    if (table === "device_tokens") {
      return Object.assign(queryChain({ data: [], error: null }, {}), {
        delete: () => Object.assign(vi.fn(), { eq: vi.fn(() => Promise.resolve({ error: null })) }),
      });
    }
    return Object.assign(vi.fn(), { select: vi.fn(), update: vi.fn(), delete: vi.fn() });
  });
  return updateFn;
}

function post(body: Record<string, unknown> | undefined, token = "cron-secret") {
  return POST(
    new Request("http://x", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}

describe("POST /api/notifications/send-push", () => {
  it("rejects requests without a valid bearer token", async () => {
    const res = await POST(new Request("http://x", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("returns an empty summary when the queue has no pending rows", async () => {
    queueFetches([]);
    const res = await post(undefined);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ processed: 0, pushed: 0, devices: 0, failed: 0 });
  });

  it("marks a row as pushed when the recipient has no device tokens", async () => {
    const updateFn = queueFetches([row()]);
    const res = await post({ notificationId: "n1" }, "webhook-secret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ processed: 1, pushed: 0, devices: 0, failed: 0 });
    expect(updateFn).toHaveBeenCalled();
    expect(updateFn.mock.calls[0][0]).toMatchObject({ pushed_at: expect.any(String) });
  });

  it("deletes a stale device token on unregistered and still marks the row pushed", async () => {
    const updateFn = vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    }));
    const deviceDelete = Object.assign(vi.fn(), { eq: vi.fn(() => Promise.resolve({ error: null })) });
    mockedAdmin.from.mockImplementation((table: string) => {
      if (table === "notification_queue") {
        return Object.assign(queryChain({ data: [row()], error: null }, {}), {
          update: updateFn,
        });
      }
      if (table === "device_tokens") {
        return Object.assign(queryChain(
          {
            data: [{ id: "d1", user_id: "u1", platform: "ios", token: "tok", locale: "de" }],
            error: null,
          },
          {},
        ), {
          delete: () => deviceDelete,
        });
      }
      return Object.assign(vi.fn(), { select: vi.fn(), update: vi.fn(), delete: vi.fn() });
    });

    vi.mocked(sendApns).mockResolvedValueOnce({
      ok: false,
      reason: "unregistered",
      message: "APNs 410: gone",
    });

    const res = await post({ notificationId: "n1" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ processed: 1, pushed: 0, devices: 0, failed: 1 });
    // `.delete().eq("id", device.id)` — the delete chain's eq must be hit.
    const eqMock = deviceDelete.eq as ReturnType<typeof vi.fn>;
    expect(eqMock).toHaveBeenCalledWith("id", "d1");
    expect(updateFn).toHaveBeenCalled();
  });

  it("leaves the row pending when delivery fails transiently (no push, no mark)", async () => {
    const updateFn = vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    }));
    mockedAdmin.from.mockImplementation((table: string) => {
      if (table === "notification_queue") {
        return Object.assign(queryChain({ data: [row()], error: null }, {}), {
          update: updateFn,
        });
      }
      if (table === "device_tokens") {
        return Object.assign(queryChain(
          {
            data: [{ id: "d1", user_id: "u1", platform: "android", token: "tok", locale: "de" }],
            error: null,
          },
          {},
        ), {
          delete: () => Object.assign(vi.fn(), { eq: vi.fn(() => Promise.resolve({ error: null })) }),
        });
      }
      return Object.assign(vi.fn(), { select: vi.fn(), update: vi.fn(), delete: vi.fn() });
    });

    vi.mocked(sendFcm).mockResolvedValueOnce({
      ok: false,
      reason: "http",
      message: "FCM 503: retry later",
    });

    const res = await post({ notificationId: "n1" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ processed: 0, pushed: 0, devices: 0, failed: 1 });
    // Row must NOT be marked pushed so the cron retries it.
    expect(updateFn).not.toHaveBeenCalled();
  });
});
