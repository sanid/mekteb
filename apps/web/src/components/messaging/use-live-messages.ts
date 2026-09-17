"use client";

import { useEffect, useId } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * Re-renders the page when a message arrives.
 *
 * Messaging was request/response everywhere except the nav badge: a reply only
 * appeared after a navigation or a manual reload, which is not what anyone
 * means by a chat.
 *
 * It deliberately does **not** append the new row to local state. It calls
 * `router.refresh()`, so the server component fetches again through the same
 * RLS-checked query that rendered the page — one data path, no second copy of
 * the shaping logic to drift, and nothing rendered that the reader is not
 * allowed to see. Realtime here is a *signal*, not a data source.
 *
 * @param threadId scope to one conversation; omit to watch every thread the
 *   caller participates in (the thread list). RLS on `messages` is what
 *   narrows "every thread" to theirs — the subscription has no filter of its
 *   own for that case.
 */
export function useLiveMessages(threadId?: string) {
  const router = useRouter();

  /*
   * The messaging layout renders the thread list twice on mobile — once in the
   * hidden desktop sidebar, once in the open sheet. Two subscribers on one
   * channel name put the Supabase client in a bad state and previously
   * surfaced as users being silently signed out (see `NavWithBadges`), so
   * every instance gets its own channel.
   */
  const instanceId = useId();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${threadId ?? "all"}:${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          ...(threadId ? { filter: `thread_id=eq.${threadId}` } : {}),
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadId, instanceId, router]);
}
