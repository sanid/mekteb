import { useEffect, useRef } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { api, onTokenRefresh, tokens } from "./api";

/**
 * Live updates, over Supabase Realtime.
 *
 * This is the **one** sanctioned exception to "never talk to Supabase
 * directly" (AGENTS.md §1): a websocket cannot go through `/api/v1` without
 * reimplementing it. Everything else — including the data these subscriptions
 * cause to be re-fetched — still goes through the API.
 *
 * The subscription is a *signal*, never a source. A payload arriving here only
 * triggers the screen's normal refetch, so the rows rendered are the ones the
 * API returns, shaped and RLS-checked exactly as on first load. Rendering the
 * websocket payload directly would be a second data path to keep in step, and
 * would put pre-shaping rows on screen that the API might narrow.
 */
type RealtimeConfig = { supabaseUrl: string; supabaseAnonKey: string };

let clientPromise: Promise<SupabaseClient | null> | null = null;

/**
 * One client for the app's lifetime, created on first use.
 *
 * The socket is authenticated with `realtime.setAuth()`, **not** the
 * `accessToken` client option. Measured on supabase-js 2.104: with only the
 * option set, the channel reports `SUBSCRIBED` and then silently delivers
 * nothing, because RLS evaluates the socket as `anon`. `setAuth` delivers.
 * The option is kept anyway for the REST calls the client might make.
 */
function getClient(): Promise<SupabaseClient | null> {
  clientPromise ??= (async () => {
    try {
      const config = await api<RealtimeConfig>("/config");
      const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
        accessToken: async () => (await tokens.get()).accessToken ?? "",
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { params: { eventsPerSecond: 2 } },
      });
      await applyAuth(client);
      // A rotated token leaves the socket authenticated as the old one, which
      // fails RLS while still reporting a healthy channel.
      onTokenRefresh(() => void applyAuth(client));
      return client;
    } catch {
      // Older server without `/config`, offline, or realtime disabled. The app
      // keeps working exactly as it did before: pull to refresh.
      return null;
    }
  })();
  return clientPromise;
}

async function applyAuth(client: SupabaseClient): Promise<void> {
  const { accessToken } = await tokens.get();
  if (accessToken) await client.realtime.setAuth(accessToken);
}

/** Forget the client on sign-out, so the next user opens their own socket. */
export function resetRealtime(): void {
  const pending = clientPromise;
  clientPromise = null;
  void pending?.then((client) => client?.removeAllChannels());
}

/**
 * Calls `onChange` when a row is inserted into `table`.
 *
 * @param filter PostgREST-style, e.g. `thread_id=eq.<uuid>`. Omit to watch
 *   every row the caller is allowed to see — RLS is what narrows that, so an
 *   unfiltered subscription still only delivers their own data.
 * @param enabled skip subscribing entirely (screen not ready, no session).
 */
export function useRealtimeInsert(
  table: string,
  filter: string | undefined,
  onChange: () => void,
  enabled = true,
): void {
  // Keeps the newest callback without making it an effect dependency: screens
  // pass an inline arrow, which would otherwise resubscribe every render.
  const handler = useRef(onChange);
  useEffect(() => {
    handler.current = onChange;
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void getClient().then((client) => {
      if (!client || cancelled) return;
      const channel = client
        .channel(`${table}:${filter ?? "all"}:${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table, ...(filter ? { filter } : {}) },
          () => handler.current(),
        )
        .subscribe();

      cleanup = () => {
        void client.removeChannel(channel);
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [table, filter, enabled]);
}

/** Convenience wrapper: messages in one thread, or in all of them. */
export function useLiveMessages(
  threadId: string | undefined,
  onChange: () => void,
  enabled = true,
): void {
  const filter = threadId ? `thread_id=eq.${threadId}` : undefined;
  useRealtimeInsert("messages", filter, onChange, enabled);
}

/** Convenience wrapper: this user's notification rows. */
export function useLiveNotifications(
  userId: string | undefined,
  onChange: () => void,
): void {
  // No memoisation needed: `useRealtimeInsert` keeps the callback in a ref, so
  // an inline arrow from the screen does not resubscribe on every render.
  useRealtimeInsert(
    "notification_queue",
    userId ? `recipient_profile_id=eq.${userId}` : undefined,
    onChange,
    !!userId,
  );
}
