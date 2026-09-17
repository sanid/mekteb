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
  const student_profile_ids: string[] = (body.student_profile_ids ?? []).map(
    String,
  ).filter(Boolean);

  if (student_profile_ids.length === 0)
    return err("Select at least one student");

  const supabase = await createSupabaseForUser(request);
  const { error } = await supabase.from("group_enrollments").insert(
    student_profile_ids.map((student_profile_id) => ({
      mosque_id: ctx.mosqueId,
      group_id: groupId,
      student_profile_id,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })),
  );

  if (error) return dbErr(error.message);
  return ok({ enrolled: student_profile_ids.length });
}
