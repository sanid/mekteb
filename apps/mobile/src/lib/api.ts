import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

import { tm } from "./i18n";

/**
 * The one place that talks to `/api/v1`.
 *
 * Screens must not call `fetch` directly — envelope unwrapping, token refresh
 * and rate-limit handling all live here so they behave identically everywhere
 * (AGENTS.md §2).
 */

/**
 * Where the API lives.
 *
 * On a simulator `localhost` reaches the Mac, but on a real device it is the
 * *phone* — so a hardcoded localhost silently fails on hardware only. In
 * development we therefore derive the host from whatever machine served the
 * JS bundle (Metro's `hostUri`, e.g. "192.168.0.88:8081") and swap in the API
 * port. That way the same build works on a simulator, on a device over Wi-Fi,
 * and on a colleague's machine with a different IP.
 *
 * `EXPO_PUBLIC_API_URL` overrides everything, and is what production builds
 * set.
 */
function resolveBaseUrl(): string {
  const configured = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
    ?.apiBaseUrl;
  if (configured && !configured.includes("localhost")) return configured;

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;

  const host = hostUri?.split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:3000`;
  }

  return configured ?? "http://localhost:3000";
}

const BASE_URL = resolveBaseUrl();

export function resolveAssetUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url}`;
}

/**
 * A phone loses signal mid-request far more often than a simulator does, and
 * `fetch` has no timeout of its own — without this the app shows a spinner
 * forever with no way back.
 */
const TIMEOUT_MS = 15_000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new ApiError(tm("timeoutError"), 0, "timeout");
    }
    throw new ApiError(tm("offlineError"), 0, "offline");
  } finally {
    clearTimeout(timer);
  }
}

const ACCESS_KEY = "mekteb.accessToken";
const REFRESH_KEY = "mekteb.refreshToken";

/** Children's accounts — tokens go in the keychain, never AsyncStorage. */
export const tokens = {
  async get() {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    return { accessToken, refreshToken };
  },
  async set(accessToken: string, refreshToken: string) {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
    ]);
  },
  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  },
};

/** Mirrors the server envelope: `{ ok, data }` / `{ ok: false, error, code }`. */
type Envelope<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    /** Seconds to wait, from `Retry-After` on a 429. */
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Internal: prevents a refresh loop. */
  _retried?: boolean;
  /** Endpoints like sign-in must not attach a stale token. */
  auth?: boolean;
  /**
   * Internal: use this bearer token instead of the stored one.
   *
   * The MFA challenge/verify calls must authenticate with the *pending*
   * session from the password step — the verified session only exists once
   * the code is accepted — and the keychain still holds the previous user's
   * tokens (or none). Without an override those calls would 401 or, worse,
   * verify a code against the wrong account.
   */
  token?: string;
};

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(`${BASE_URL}/api/v1${path}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/**
 * Called after the access token is rotated.
 *
 * Realtime needs to hear about it: its websocket is authenticated once, at
 * subscribe time, and keeps using that token until told otherwise. A
 * subscriber holding a rotated-away token silently stops receiving rows —
 * silently, because the socket stays connected and "SUBSCRIBED".
 *
 * A registration hook rather than a direct call, so `api.ts` stays the
 * dependency-free bottom of the stack.
 */
const tokenRefreshListeners: (() => void)[] = [];

export function onTokenRefresh(listener: () => void): void {
  tokenRefreshListeners.push(listener);
}

/**
 * Outcome of a refresh attempt.
 *
 * - "ok": tokens rotated and stored.
 * - "dead": the refresh token is definitively invalid (real 401) — the
 *   session is gone and the caller should treat the user as signed out.
 * - "transient": offline, throttled (429) or server fault (5xx) — the tokens
 *   are still valid, they just could not be rotated right now. The caller
 *   must NOT sign the user out over a temporary condition.
 */
type RefreshResult = "ok" | "dead" | "transient";

/**
 * Refresh is de-duplicated behind a single in-flight promise.
 *
 * On a cold start several screens fetch in parallel and can all 401 at once
 * if the access token expired while the app was closed. Without dedup each
 * one would refresh with the *same* refresh token concurrently; Supabase
 * rotates it on use, so the first caller stores the fresh pair and the
 * siblings then refresh with an already-rotated token, get a 401, and erase
 * the session the first caller just repaired. Deduping makes the first
 * caller perform (and await) the refresh and the rest reuse its result.
 */
let refreshInFlight: Promise<RefreshResult> | null = null;

async function doRefresh(): Promise<RefreshResult> {
  const { refreshToken } = await tokens.get();
  if (!refreshToken) return "dead";

  let res: Response;
  try {
    res = await fetchWithTimeout(buildUrl("/auth/refresh"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Offline: keep the tokens so a later retry can still succeed.
    return "transient";
  }

  // A throttled or faulting server is a temporary condition, not a dead
  // session — keep the tokens and let the next 401-driven attempt retry.
  if (res.status === 429 || res.status >= 500) return "transient";

  const json = (await res.json()) as Envelope<{
    accessToken: string;
    refreshToken: string;
  }>;
  if (!res.ok || !json.ok) {
    // A real 401 here means the refresh token was rotated away or revoked —
    // clearing is correct. Transient statuses were already returned above.
    await tokens.clear();
    return "dead";
  }
  await tokens.set(json.data.accessToken, json.data.refreshToken);
  for (const listener of tokenRefreshListeners) listener();
  return "ok";
}

function refreshTokens(): Promise<RefreshResult> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true, _retried = false, token } = options;

  const headers: Record<string, string> = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (auth) {
    // The MFA flow passes an explicit pending token; otherwise read the
    // stored session (which may legitimately be absent).
    const accessToken = token ?? (await tokens.get()).accessToken;
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  }

  const res = await fetchWithTimeout(buildUrl(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // Refresh exactly once, then give up — never loop (AGENTS.md §2).
  if (res.status === 401 && auth && !_retried) {
    const refreshed = await refreshTokens();
    if (refreshed === "ok") {
      return api<T>(path, { ...options, _retried: true });
    }
    if (refreshed === "transient") {
      // The refresh could not complete (offline/throttled/server fault) but
      // the tokens are still valid — surface a transient error instead of
      // bouncing a real session to the sign-in screen.
      throw new ApiError(tm("offlineError"), 0, "offline");
    }
    // "dead" — tokens were cleared; fall through to the 401 envelope below.
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after")) || undefined;
    throw new ApiError(tm("rateLimited"), 429, "rate_limited", retryAfter);
  }

  let json: Envelope<T>;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError(tm("badResponse"), res.status);
  }

  if (!json.ok) {
    // `error` is already localised and sanitised server-side — safe to show.
    throw new ApiError(json.error, res.status, json.code);
  }

  return json.data;
}
