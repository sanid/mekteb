"use server";

import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Marks all unread notifications as read for the current user. */
export async function markNotificationsRead(): Promise<void> {
  const ctx = await requireMember();
  const supabase = await createClient();
  await supabase
    .from("notification_queue")
    .update({ is_read: true })
    .eq("recipient_profile_id", ctx.userId)
    .eq("is_read", false);
}
