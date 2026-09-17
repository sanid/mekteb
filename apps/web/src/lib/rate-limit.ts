import { headers } from "next/headers";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Shared, cross-instance store. Configure UPSTASH_REDIS_REST_URL /
// UPSTASH_REDIS_REST_TOKEN (e.g. via the Vercel Marketplace Upstash
// integration) for correct rate limiting across multiple Fluid Compute
// instances. Without it, falls back to an in-memory, per-instance store —
// fine for local dev, but not a real guarantee in production.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const limiters = new Map<string, Ratelimit>();

function getLimiter(prefix: string, maxRequests: number, windowMs: number): Ratelimit {
  const cacheKey = `${prefix}:${maxRequests}:${windowMs}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.fixedWindow(maxRequests, `${windowMs} ms`),
      prefix,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

async function redisCheck(
  identifier: string,
  prefix: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const { success, reset } = await getLimiter(prefix, maxRequests, windowMs).limit(identifier);
  return { allowed: success, retryAfterMs: success ? 0 : Math.max(0, reset - Date.now()) };
}

// --- In-memory fallback (no Redis configured) -----------------------------

const store = new Map<string, { count: number; resetTime: number }>();
const MAX_STORE_SIZE = 10_000;

function sweep(now: number) {
  if (store.size <= MAX_STORE_SIZE) return;
  for (const [key, entry] of store) {
    if (now > entry.resetTime) store.delete(key);
  }
}

function inMemoryCheck(
  bucketKey: string,
  maxRequests: number,
  windowMs: number,
  now: number,
): { allowed: boolean; retryAfterMs: number } {
  const entry = store.get(bucketKey);
  if (!entry || now > entry.resetTime) {
    store.set(bucketKey, { count: 1, resetTime: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetTime - now };
  }
  return { allowed: true, retryAfterMs: 0 };
}

// ---------------------------------------------------------------------------

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Rate limit, backed by Upstash Redis when configured (correct across all
 * serverless instances) or an in-memory map otherwise (per-instance only —
 * local dev fallback).
 *
 * Composite-key aware (pass `key` parts like the email being signed-in with
 * so shared NAT / corporate WiFi can't lock out everyone).
 *
 * When `perIpLimit` is set, an additional IP-only bucket is checked to
 * prevent a single attacker from flooding many different `key` values.
 */
export async function checkRateLimit(options: {
  windowMs: number;
  maxRequests: number;
  key?: string;
  bucket?: string;
  perIpLimit?: number;
}): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const now = Date.now();
  const ip = await clientIp();
  const bucket = options.bucket ?? "default";

  if (options.perIpLimit) {
    const ipResult = redis
      ? await redisCheck(ip, `ratelimit:${bucket}:ip`, options.perIpLimit, options.windowMs)
      : inMemoryCheck(`${bucket}:__ip__:${ip}`, options.perIpLimit, options.windowMs, now);
    if (!ipResult.allowed) return ipResult;
  }

  const identifier = `${options.key ?? ""}:${ip}`;

  if (redis) {
    return redisCheck(identifier, `ratelimit:${bucket}`, options.maxRequests, options.windowMs);
  }

  sweep(now);
  return inMemoryCheck(`${bucket}:${identifier}`, options.maxRequests, options.windowMs, now);
}
