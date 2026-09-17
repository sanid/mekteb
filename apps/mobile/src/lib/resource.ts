import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

import { ApiError } from "./api";

/**
 * Stale-while-revalidate cache for screen data.
 *
 * Every screen used to hold its rows in local state, so leaving and coming
 * back threw them away and showed a full-screen spinner again — on a phone
 * that is most navigations, and on a slow connection it made the app feel
 * broken. Now the cached rows render immediately and a refetch runs quietly
 * behind them; the spinner is only for data this device has never seen.
 *
 * Deliberately ~100 lines rather than a query library: the app needs cache,
 * dedupe and focus-revalidation, not a full data layer, and every dependency
 * added here is one more thing to keep working across Expo upgrades.
 */
type Entry = { data: unknown; at: number };

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/** How long cached data is served without a background refetch on focus. */
const DEFAULT_TTL_MS = 30_000;

/**
 * Drops cached entries so the next read refetches.
 *
 * Call after a mutation with the prefix it affects — saving attendance
 * invalidates `groups/`, so the group screen and the home counts both pick
 * the change up instead of showing what was true before the write.
 */
export function invalidate(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/** Wipes everything — used on sign-out so the next user sees nothing stale. */
export function clearCache() {
  store.clear();
  inflight.clear();
}

export function peek<T>(key: string): T | null {
  return (store.get(key)?.data as T | undefined) ?? null;
}

/** Writes a value straight into the cache (optimistic updates). */
export function put<T>(key: string, data: T) {
  store.set(key, { data, at: Date.now() });
}

/** Shares one in-flight request between screens asking for the same key. */
function load<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fetcher()
    .then((data) => {
      store.set(key, { data, at: Date.now() });
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export type Resource<T> = {
  /** `null` only until this device has loaded the key once. */
  data: T | null;
  error: string | null;
  /** True only for an explicit pull-to-refresh, never for background work. */
  refreshing: boolean;
  refresh: () => Promise<void>;
  /** Replaces the cached value locally, without a request. */
  set: (updater: T | ((current: T | null) => T)) => void;
};

export function useResource<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: { ttlMs?: number; fallbackError?: string } = {},
): Resource<T> {
  const { ttlMs = DEFAULT_TTL_MS, fallbackError } = options;

  const [data, setData] = useState<T | null>(() => (key ? peek<T>(key) : null));
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Keeps the newest fetcher without making it an effect dependency: screens
  // build it inline, so a naive dependency would refetch on every render.
  // Assigned in an effect rather than during render — refs must not be written
  // while rendering, and every read happens later, from a focus callback.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(
    async (mode: "background" | "manual") => {
      if (!key) return;
      if (mode === "manual") setRefreshing(true);
      try {
        const next = await load(key, fetcherRef.current);
        if (!alive.current) return;
        setData(next);
        setError(null);
      } catch (e) {
        if (!alive.current) return;
        const message =
          e instanceof ApiError ? e.message : (fallbackError ?? "Request failed.");
        // A failed *background* refresh must not replace good rows with an
        // error — the screen keeps showing what it has and says so quietly.
        setError(message);
      } finally {
        if (alive.current && mode === "manual") setRefreshing(false);
      }
    },
    [key, fallbackError],
  );

  /**
   * Revalidate whenever the screen comes into view — including the first
   * time. Fresh-enough data is left alone so switching tabs quickly does not
   * hammer the API.
   */
  useFocusEffect(
    useCallback(() => {
      if (!key) return;
      const cached = store.get(key);
      if (cached) {
        setData(cached.data as T);
        if (Date.now() - cached.at < ttlMs) return;
      }
      void run("background");
    }, [key, ttlMs, run]),
  );

  const set = useCallback(
    (updater: T | ((current: T | null) => T)) => {
      if (!key) return;
      setData((current) => {
        const next =
          typeof updater === "function"
            ? (updater as (c: T | null) => T)(current)
            : updater;
        put(key, next);
        return next;
      });
    },
    [key],
  );

  return { data, error, refreshing, refresh: () => run("manual"), set };
}
