import { NextRequest } from "next/server";
import { requireApiExaminer, createSupabaseForUser } from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized, notFound } from "@/app/api/v1/helpers/response";
import { writeAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireApiExaminer(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const { data: session, error } = await supabase
    .from("exam_sessions")
    .select(
      "id, status, summary, exam_date, diploma_generated_at, from_group_id, to_group_id, exam_request_id, schedule_status, proposed_date, proposed_by, oral_required, written_required, oral_passed, written_passed, retake_of_session_id, student_profiles(full_name), groups!exam_sessions_from_group_id_fkey(name)",
    )
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (error) return dbErr(error.message);
  if (!session) return notFound();

  return ok(session);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  const ctx = await requireApiExaminer(request);
  if (!ctx) return unauthorized();

  const body = await request.json();
  const { status: newStatus, summary, to_group_id, exam_date } = body as {
    status?: string;
    summary?: string;
    to_group_id?: string;
    exam_date?: string;
  };

  const validStatuses = ["scheduled", "in_progress", "passed", "failed"];
  if (!newStatus || !validStatuses.includes(newStatus))
    return err(`status must be one of: ${validStatuses.join(", ")}`);

  const supabase = await createSupabaseForUser(request);

  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id, mosque_id, student_profile_id, from_group_id, status, exam_request_id")
    .eq("id", sessionId)
    .eq("examiner_profile_id", ctx.teacherProfileId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!session) return notFound("Exam session not found");
  const terminalStatuses = ["passed", "failed"];
  if (terminalStatuses.includes(session.status))
    return err("Exam session is already completed");

  if (newStatus === "passed" && to_group_id) {
    const { data: targetGroup } = await supabase
      .from("groups")
      .select("id, mosque_id")
      .eq("id", to_group_id)
      .eq("mosque_id", ctx.mosqueId)
      .maybeSingle();

    if (!targetGroup) return err("Target group not found in this mosque");
  }

  const { error: updateError } = await supabase
    .from("exam_sessions")
    .update({
      status: newStatus,
      summary: summary ?? null,
      exam_date: exam_date || undefined,
      to_group_id: newStatus === "passed" ? (to_group_id ?? null) : null,
      updated_by: ctx.userId,
    })
    .eq("id", sessionId);

  if (updateError) return dbErr(updateError.message);

  if (newStatus === "passed" && to_group_id) {
    await supabase
      .from("group_enrollments")
      .update({
        is_active: false,
        ended_at: new Date().toISOString().slice(0, 10),
        updated_by: ctx.userId,
      })
      .eq("student_profile_id", session.student_profile_id)
      .eq("group_id", session.from_group_id)
      .eq("is_active", true);

    await supabase
      .from("group_enrollments")
      .insert({
        mosque_id: ctx.mosqueId,
        group_id: to_group_id,
        student_profile_id: session.student_profile_id,
        enrolled_at: new Date().toISOString().slice(0, 10),
        created_by: ctx.userId,
        updated_by: ctx.userId,
      });

    await writeAuditLog({
      mosqueId: ctx.mosqueId,
      actorUserId: ctx.userId,
      action: "exam.student_promoted",
      targetTable: "group_enrollments",
      targetId: session.student_profile_id,
      metadata: {
        from_group: session.from_group_id,
        to_group: to_group_id,
        exam_session_id: sessionId,
      },
    });
  }

  if (session.exam_request_id) {
    await supabase
      .from("exam_requests")
      .update({ status: "completed" })
      .eq("id", session.exam_request_id);
  }

  const { data: updated } = await supabase
    .from("exam_sessions")
    .select("id, status, summary, exam_date, student_profiles(full_name), groups!exam_sessions_from_group_id_fkey(name)")
    .eq("id", sessionId)
    .single();

  return ok(updated);
}
