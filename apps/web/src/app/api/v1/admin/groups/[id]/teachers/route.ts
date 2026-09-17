import { NextRequest } from "next/server";

import { requireApiAdmin, createSupabaseForUser } from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const { id: groupId } = await params;
  const body = await request.json();
  const teacher_profile_ids: string[] = (body.teacher_profile_ids ?? []).map(
    String,
  ).filter(Boolean);

  if (teacher_profile_ids.length === 0)
    return err("Select at least one teacher");

  const supabase = await createSupabaseForUser(request);
  const { error } = await supabase.from("teacher_group_links").insert(
    teacher_profile_ids.map((teacher_profile_id) => ({
      mosque_id: ctx.mosqueId,
      group_id: groupId,
      teacher_profile_id,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })),
  );

  if (error) return dbErr(error.message);
  return ok({ assigned: teacher_profile_ids.length });
}
