import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

import { headers } from "next/headers";

function mockHeaders(ip: string) {
  (headers as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    get: (name: string) => (name === "x-forwarded-for" ? ip : null),
  });
}

describe("checkRateLimit (in-memory fallback, no Upstash configured)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("allows requests under the limit and blocks once exceeded", async () => {
    mockHeaders("1.2.3.4");
    const { checkRateLimit } = await import("./rate-limit");
    const opts = { bucket: "test-basic", windowMs: 60_000, maxRequests: 2, key: "user@example.com" };

    expect((await checkRateLimit(opts)).allowed).toBe(true);
    expect((await checkRateLimit(opts)).allowed).toBe(true);

    const third = await checkRateLimit(opts);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets the window after windowMs passes", async () => {
    mockHeaders("1.2.3.4");
    const { checkRateLimit } = await import("./rate-limit");
    vi.useFakeTimers();
    const opts = { bucket: "test-reset", windowMs: 1000, maxRequests: 1, key: "a" };

    expect((await checkRateLimit(opts)).allowed).toBe(true);
    expect((await checkRateLimit(opts)).allowed).toBe(false);

    vi.advanceTimersByTime(1001);

    expect((await checkRateLimit(opts)).allowed).toBe(true);
  });

  it("tracks separate buckets per key", async () => {
    mockHeaders("1.2.3.4");
    const { checkRateLimit } = await import("./rate-limit");
    const optsA = { bucket: "test-keys", windowMs: 60_000, maxRequests: 1, key: "userA" };
    const optsB = { bucket: "test-keys", windowMs: 60_000, maxRequests: 1, key: "userB" };

    expect((await checkRateLimit(optsA)).allowed).toBe(true);
    expect((await checkRateLimit(optsA)).allowed).toBe(false);
    expect((await checkRateLimit(optsB)).allowed).toBe(true);
  });

  it("enforces perIpLimit across different keys from the same IP", async () => {
    mockHeaders("9.9.9.9");
    const { checkRateLimit } = await import("./rate-limit");
    const base = { bucket: "test-perip", windowMs: 60_000, maxRequests: 100, perIpLimit: 2 };

    expect((await checkRateLimit({ ...base, key: "user1" })).allowed).toBe(true);
    expect((await checkRateLimit({ ...base, key: "user2" })).allowed).toBe(true);

    const third = await checkRateLimit({ ...base, key: "user3" });
    expect(third.allowed).toBe(false);
  });
});

describe("checkRateLimit (Upstash Redis configured)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    mockHeaders("5.6.7.8");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@upstash/redis");
    vi.doUnmock("@upstash/ratelimit");
  });

  it("delegates to Ratelimit.limit() and maps allow/deny + retryAfterMs", async () => {
    const reset = Date.now() + 5000;
    const limitMock = vi
      .fn()
      .mockResolvedValueOnce({ success: true, reset: 0 })
      .mockResolvedValueOnce({ success: false, reset });

    vi.doMock("@upstash/redis", () => ({ Redis: vi.fn() }));
    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: Object.assign(
        vi.fn(function RatelimitMock(this: { limit: typeof limitMock }) {
          this.limit = limitMock;
        }),
        { fixedWindow: vi.fn() },
      ),
    }));

    const { checkRateLimit } = await import("./rate-limit");
    const opts = { bucket: "redis-test", windowMs: 60_000, maxRequests: 10, key: "user@example.com" };

    const first = await checkRateLimit(opts);
    expect(first.allowed).toBe(true);
    expect(first.retryAfterMs).toBe(0);

    const second = await checkRateLimit(opts);
    expect(second.allowed).toBe(false);
    expect(second.retryAfterMs).toBeGreaterThan(0);
  });
});
