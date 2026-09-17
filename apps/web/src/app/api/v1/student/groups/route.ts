import { NextRequest } from "next/server";

import {
  requireApiStudent,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

/**
 * The student's enrolled groups — the mobile counterpart to the group cards
 * on the web student home. RLS narrows `group_enrollments` to the caller's
 * own rows, so no extra filtering is needed here.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiStudent(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);
  const { data, error } = await supabase
    .from("group_enrollments")
    .select("id, groups(id, name, description, room)")
    .eq("student_profile_id", ctx.studentProfileId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return dbErr(error.message);

  const groups = (data ?? [])
    .map((e) => e.groups as unknown)
    .filter(
      (g): g is { id: string; name: string; description: string | null; room: string | null } =>
        !!g && typeof g === "object",
    );

  return ok(groups);
}
