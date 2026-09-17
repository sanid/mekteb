import { NextRequest } from "next/server";

import {
  requireApiParent,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: homeworkId } = await params;
  const ctx = await requireApiParent(request);
  if (!ctx) return unauthorized();

  const body = await request.json();
  const { student_profile_id } = body as { student_profile_id?: string };
  if (!student_profile_id) return err("student_profile_id is required");

  const supabase = await createSupabaseForUser(request);

  const { data: link } = await supabase
    .from("parent_student_links")
    .select("id")
    .eq("parent_profile_id", ctx.parentProfileId)
    .eq("student_profile_id", student_profile_id)
    .maybeSingle();
  if (!link) return err("Not authorized", 403);

  const { error } = await supabase.from("homework_submissions").upsert(
    {
      mosque_id: ctx.mosqueId,
      homework_id: homeworkId,
      student_profile_id,
      acknowledged_by: ctx.userId,
      acknowledged_at: new Date().toISOString(),
      created_by: ctx.userId,
      updated_by: ctx.userId,
    },
    { onConflict: "homework_id,student_profile_id" },
  );
  if (error) return dbErr(error.message);

  return ok({ acknowledged: true });
}
