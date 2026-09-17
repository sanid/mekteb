import { NextRequest } from "next/server";
import { requireApiTeacher, requireApiExaminer, createSupabaseForUser } from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized, notFound } from "@/app/api/v1/helpers/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Both teachers (who created the request) and examiners (who handle it) can read it.
  const teacher = await requireApiTeacher(request);
  const examiner = teacher ? null : await requireApiExaminer(request);
  const ctx = teacher ?? examiner;
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const { data: req, error } = await supabase
    .from("exam_requests")
    .select(
      "id, status, notes, created_at, student_profiles(full_name), groups(name), teacher_profiles(profiles(full_name))",
    )
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (error) return dbErr(error.message);
  if (!req) return notFound();

  // Also attach the linked session if any
  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id, status, summary, exam_date, schedule_status")
    .eq("exam_request_id", id)
    .eq("mosque_id", ctx.mosqueId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return ok({ ...req, session: session ?? null });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const { error } = await supabase
    .from("exam_requests")
    .update({ status: "cancelled", updated_by: ctx.userId })
    .eq("id", id)
    .eq("requested_by", ctx.teacherProfileId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("status", "pending");

  if (error) return dbErr(error.message);

  return ok({ cancelled: true });
}
