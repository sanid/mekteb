import { NextRequest } from "next/server";

import {
  requireApiTeacher,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

export async function GET(request: NextRequest) {
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const { data: links, error: linksErr } = await supabase
    .from("teacher_group_links")
    .select("group_id")
    .eq("teacher_profile_id", ctx.teacherProfileId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_active", true);

  if (linksErr) return dbErr(linksErr.message);

  const groupIds = (links ?? []).map((l) => l.group_id);
  if (groupIds.length === 0) return ok([]);

  const { data, error } = await supabase
    .from("groups")
    .select(`
      id,
      name,
      description,
      is_active,
      created_at,
      updated_at,
      group_enrollments(id, is_active),
      teacher_group_links(id)
    `)
    .in("id", groupIds)
    .eq("mosque_id", ctx.mosqueId)
    .order("name");

  if (error) return dbErr(error.message);

  const mapped = (data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    is_active: g.is_active,
    created_at: g.created_at,
    updated_at: g.updated_at,
    student_count: g.group_enrollments?.filter((e) => e.is_active).length ?? 0,
    teacher_count: g.teacher_group_links?.length ?? 0,
  }));

  return ok(mapped);
}
