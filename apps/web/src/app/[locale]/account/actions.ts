"use server";

import { cache } from "react";

import { requireUser } from "@/lib/auth";
import { getActiveMosqueCookie } from "@/lib/mosque-session";
import { createClient } from "@/lib/supabase/server";
import { dbActionErr, type ActionResult } from "@/lib/action-result";

/**
 * Per-user notification preferences (open.md §4).
 *
 * Preferences are per (mosque, user, type). The account page operates on the
 * user's *active* mosque — the cookie set by the admin mosque switcher, else
 * their first membership — which is what `requireAdmin`/`requireTeacher`
 * already do. A single-mosque user never sees the distinction.
 */

export type NotificationType =
  | "message"
  | "announcement"
  | "homework"
  | "attendance_absent"
  | "lesson_cancelled";

export type NotificationPrefs = {
  mosqueId: string;
  mosqueName: string;
  /** Enabled flags per type — absent key means enabled (opt-out model). */
  prefs: Record<NotificationType, boolean>;
};

const TYPES: NotificationType[] = [
  "message",
  "announcement",
  "homework",
  "attendance_absent",
  "lesson_cancelled",
];

/** The user's active mosque: cookie preference, else first membership. */
const activeMosque = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("memberships")
    .select("mosque_id, mosques(name)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at");

  if (!memberships || memberships.length === 0) return null;

  const cookieId = await getActiveMosqueCookie();
  const preferred =
    memberships.find((m) => m.mosque_id === cookieId) ?? memberships[0];
  return {
    mosqueId: preferred.mosque_id,
    mosqueName:
      (preferred.mosques as { name: string } | null)?.name ?? "Mosque",
  };
});

export async function getNotificationPrefs(): Promise<NotificationPrefs | null> {
  const user = await requireUser();
  const mosque = await activeMosque(user.userId);
  if (!mosque) return null;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("notification_preferences")
    .select("type, enabled")
    .eq("mosque_id", mosque.mosqueId)
    .eq("profile_id", user.userId);

  const prefs = Object.fromEntries(
    TYPES.map((t) => [t, true]),
  ) as Record<NotificationType, boolean>;
  for (const row of rows ?? []) {
    prefs[row.type as NotificationType] = row.enabled;
  }

  return { mosqueId: mosque.mosqueId, mosqueName: mosque.mosqueName, prefs };
}

export async function updateNotificationPref(
  mosqueId: string,
  type: NotificationType,
  enabled: boolean,
): Promise<ActionResult> {
  const user = await requireUser();
  const mosque = await activeMosque(user.userId);
  if (!mosque || mosque.mosqueId !== mosqueId) {
    return { error: "Not authorised for this mosque." };
  }
  if (!TYPES.includes(type)) return { error: "Unknown notification type." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        mosque_id: mosqueId,
        profile_id: user.userId,
        type,
        enabled,
      },
      { onConflict: "mosque_id,profile_id,type" },
    );

  if (error) return await dbActionErr(error.message, "updateNotificationPref");
  return { ok: true as const };
}
