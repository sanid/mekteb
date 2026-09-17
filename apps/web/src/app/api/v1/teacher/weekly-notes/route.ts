import { NextRequest } from "next/server";

import {
  requireApiTeacher,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

async function assertTeacherOfGroup(
  supabase: Awaited<ReturnType<typeof createSupabaseForUser>>,
  teacherProfileId: string,
  groupId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("teacher_group_links")
    .select("id")
    .eq("teacher_profile_id", teacherProfileId)
    .eq("group_id", groupId)
    .eq("is_active", true)
    .maybeSingle();
  return Boolean(data);
}

/**
 * A teacher's own weekly summaries — the mobile group screen reads and edits
 * the current week next to the roster, so it needs the same rows the web
 * group page queries server-side. Optionally narrowed to one group; the rows
 * are the caller's own (they wrote them), so no extra group-link check is
 * needed beyond mosque scoping.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const groupId = new URL(request.url).searchParams.get("group_id")?.trim();

  const supabase = await createSupabaseForUser(request);
  let query = supabase
    .from("teacher_weekly_notes")
    .select("id, group_id, week_start, body, is_published, created_at, updated_at")
    .eq("mosque_id", ctx.mosqueId)
    .eq("author_profile_id", ctx.userId)
    .order("week_start", { ascending: false });
  if (groupId) query = query.eq("group_id", groupId);

  const { data, error } = await query.limit(52);
  if (error) return dbErr(error.message);
  return ok(data ?? []);
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const body = await request.json();
  const {
    group_id,
    week_start,
    body: noteBody,
    is_published = false,
  } = body as {
    group_id?: string;
    week_start?: string;
    body?: string;
    is_published?: boolean;
  };

  if (!group_id) return err("group_id is required");
  if (!week_start?.trim()) return err("Week start date is required");
  if (!noteBody?.trim()) return err("Summary cannot be empty");

  const supabase = await createSupabaseForUser(request);
  if (
    !(await assertTeacherOfGroup(supabase, ctx.teacherProfileId, group_id))
  ) {
    return err("Not authorized for this group", 403);
  }

  const { error } = await supabase
    .from("teacher_weekly_notes")
    .upsert(
      {
        mosque_id: ctx.mosqueId,
        group_id,
        author_profile_id: ctx.userId,
        week_start: week_start.trim(),
        body: noteBody.trim(),
        is_published,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
      { onConflict: "group_id,week_start" },
    );
  if (error) return dbErr(error.message);

  return ok({ upserted: true });
}
