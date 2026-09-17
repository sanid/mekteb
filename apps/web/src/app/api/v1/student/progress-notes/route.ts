import { NextRequest } from "next/server";

import {
  requireApiStudent,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { requireApiPlugin } from "@/app/api/v1/helpers/plugins";

/**
 * A student's progress notes — the notes teachers wrote about them
 * (mirrors the web `/student/progress-notes` page). Read-only; RLS limits
 * the rows to notes about the caller's own student profile.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiStudent(request);
  if (!ctx) return unauthorized();

  const gate = await requireApiPlugin(request, ctx.mosqueId, "lesson_library");
  if (gate) return gate;

  const supabase = await createSupabaseForUser(request);

  const { data, error } = await supabase
    .from("progress_notes")
    .select("id, body, created_at, group_id, groups(name)")
    .eq("student_profile_id", ctx.studentProfileId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return dbErr(error.message);

  return ok({
    notes: (data ?? []).map((n) => ({
      id: n.id,
      body: n.body,
      createdAt: n.created_at,
      groupName: (n.groups as { name: string } | null)?.name ?? null,
    })),
  });
}
