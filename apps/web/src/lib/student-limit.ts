"use server";

import { getTranslations } from "next-intl/server";
import { createAdminClient } from "./supabase/admin";

// Returns a translated error string if the mosque has hit its plan's student limit,
// or null if adding another student is allowed.
export async function checkStudentLimit(mosqueId: string): Promise<string | null> {
  const admin = createAdminClient();

  const [{ count }, { data: sub }] = await Promise.all([
    admin
      .from("student_profiles")
      .select("id", { count: "exact", head: true })
      .eq("mosque_id", mosqueId),
    admin
      .from("mosque_subscriptions")
      .select("plans(max_students)")
      .eq("mosque_id", mosqueId)
      .maybeSingle(),
  ]);

  const maxStudents = (sub?.plans as { max_students: number | null } | null)?.max_students ?? null;

  // null means unlimited (community plan)
  if (maxStudents === null) return null;
  if ((count ?? 0) >= maxStudents) {
    const t = await getTranslations("Admin");
    return t("studentLimitReached");
  }

  return null;
}
