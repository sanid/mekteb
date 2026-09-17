import { NextRequest } from "next/server";
import { requireApiStudent, createSupabaseForUser } from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

export async function GET(request: NextRequest) {
  const ctx = await requireApiStudent(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const { data, error } = await supabase
    .from("exam_sessions")
    .select(
      // `proposed_date` and `proposed_by` are what make the scheduling
      // actionable: whose turn it is decides whether the student may accept.
      "id, status, summary, exam_date, schedule_status, proposed_date, proposed_by, diploma_generated_at",
    )
    .eq("student_profile_id", ctx.studentProfileId)
    .eq("mosque_id", ctx.mosqueId)
    .order("exam_date", { ascending: false });

  if (error) return dbErr(error.message);

  return ok({ sessions: data });
}
