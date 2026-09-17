"use client";

import { useEffect, useId, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { NavLink } from "@/components/NavLink";

export type BadgeNavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badgeKey?: "messages" | "notifications";
};

/**
 * Renders nav links with live badge counts for unread messages and
 * notifications. Initial counts come from the server; Supabase Realtime
 * increments them without a full page reload.
 *
 * Badges reset naturally on navigation because the server re-fetches counts
 * on every page render (SSR).
 */
export function NavWithBadges({
  items,
  userId,
  initialMessageBadge,
  initialNotifBadge,
}: {
  items: BadgeNavItem[];
  userId: string;
  initialMessageBadge: number;
  initialNotifBadge: number;
}) {
  const [badges, setBadges] = useState({
    messages: initialMessageBadge,
    notifications: initialNotifBadge,
  });
  // Unique per-instance channel name. The teacher / parent layout renders
  // this component twice on mobile (once in the hidden desktop sidebar,
  // once inside the open mobile sheet). If both instances subscribed to
  // the same `nav-badges:${userId}` channel, the Supabase client would
  // get into a bad state and the session could be silently dropped —
  // which surfaced as users being "logged out" when opening the menu.
  const instanceId = useId();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`nav-badges:${userId}:${instanceId}`)
      // New message in any thread the user participates in.
      // RLS on messages filters delivery to threads the user is part of.
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => setBadges((b) => ({ ...b, messages: b.messages + 1 })),
      )
      // New notification for this user.
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notification_queue",
          filter: `recipient_profile_id=eq.${userId}`,
        },
        () =>
          setBadges((b) => ({ ...b, notifications: b.notifications + 1 })),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, instanceId]);

  return (
    <nav className="flex-1 space-y-1">
      {items.map(({ href, label, icon, badgeKey }) => (
        <NavLink
          key={href}
          href={href}
          label={label}
          icon={icon}
          badge={badgeKey ? badges[badgeKey] : 0}
        />
      ))}
    </nav>
  );
}
