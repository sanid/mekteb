import { describe, expect, it, vi } from "vitest";

// notification-text imports formatDate from @/lib/format, which pulls in
// next-intl/navigation (next/navigation) — not resolvable in a node test env.
vi.mock("@/lib/format", () => ({
  formatDate: (value: string) => value,
}));

import { buildPushPayload, resolveLocale, type PushNotification } from "@/lib/push/payload";

function notif(overrides: Partial<PushNotification> = {}): PushNotification {
  return {
    subject: null,
    body: "Some body",
    created_at: "2026-08-12T10:00:00Z",
    ...overrides,
  };
}

describe("resolveLocale", () => {
  it("returns the device locale when it is supported", () => {
    expect(resolveLocale("bs")).toBe("bs");
  });

  it("falls back to the default locale for unknown values", () => {
    expect(resolveLocale("fr")).toBe("de");
    expect(resolveLocale(null)).toBe("de");
    expect(resolveLocale(undefined)).toBe("de");
  });
});

describe("buildPushPayload", () => {
  it("renders a templated message.new push in the reader's locale", () => {
    const payload = buildPushPayload(
      notif({
        template_key: "message.new",
        template_params: { sender: "Amina" },
        thread_id: "thread-123",
      }),
      "de",
    );
    expect(payload.title).toBe("Neue Nachricht");
    expect(payload.body).toContain("Amina");
    expect(payload.data.threadId).toBe("thread-123");
  });

  it("carries the thread id so a tap opens the conversation", () => {
    const payload = buildPushPayload(notif({ thread_id: "t-1" }), "de");
    expect(payload.data.threadId).toBe("t-1");
    expect(payload.data.announcementId).toBeUndefined();
  });

  it("carries the announcement id for announcement pushes", () => {
    const payload = buildPushPayload(notif({ source_announcement_id: "ann-1" }), "de");
    expect(payload.data.announcementId).toBe("ann-1");
  });

  it("carries the written-test token from template_params", () => {
    const payload = buildPushPayload(
      notif({
        template_key: "written_test.new",
        template_params: { title: "Test 1", token: "tok-xyz" },
      }),
      "de",
    );
    expect(payload.data.writtenTestToken).toBe("tok-xyz");
    expect(payload.data.threadId).toBeUndefined();
  });

  it("keeps the stored words as the fallback for untemplated rows", () => {
    const payload = buildPushPayload(notif({ subject: "Ein Ereignis", body: "Etwas ist passiert." }), "de");
    expect(payload.title).toBe("Ein Ereignis");
    expect(payload.body).toBe("Etwas ist passiert.");
  });
});
