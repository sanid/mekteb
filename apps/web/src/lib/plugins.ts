import { cache } from "react";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "./supabase/server";

export type PluginId =
  | "lesson_library"
  | "exam_system"
  | "messaging"
  | "announcements"
  | "notifications"
  | "calendar"
  | "annual_report"
  | "quran_hifz"
  | "prayer_times"
  | "enrollment"
  | "qr_self_signup"
  | "student_checkin";

export const getActivePlugins = cache(async (mosqueId: string): Promise<Set<string>> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mosque_plugins")
    .select("plugin_id")
    .eq("mosque_id", mosqueId)
    .eq("is_active", true);
  return new Set((data ?? []).map((r) => r.plugin_id));
});

// Call after requireAdmin/requireTeacher/etc. Redirects to the role home if plugin is off.
export async function requirePlugin(
  mosqueId: string,
  plugin: PluginId,
  roleHome: string, // e.g. "/admin", "/teacher", "/parent"
): Promise<void> {
  const active = await getActivePlugins(mosqueId);
  if (!active.has(plugin)) {
    const locale = await getLocale();
    redirect(`/${locale}${roleHome}`);
  }
}
