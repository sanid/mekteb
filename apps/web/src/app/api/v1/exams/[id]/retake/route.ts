import { NextRequest } from "next/server";

import {
  requireApiExaminer,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

/**
 * Propose a retake after a failed exam: a new session linked to the failed
 * one, proposed to the student/parent for confirmation. Mirror of the web
 * `proposeRetake` action.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: failedSessionId } = await params;
  const ctx = await requireApiExaminer(request);
  if (!ctx) return unauthorized();

  const body = await request.json();
  const proposedDate =
    typeof body.proposed_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.proposed_date)
      ? body.proposed_date
      : null;
  if (!proposedDate) return err("proposed_date is required (YYYY-MM-DD)");

  const oralRequired = Boolean(body.oral_required);
  const writtenRequired = Boolean(body.written_required);
  if (!oralRequired && !writtenRequired)
    return err("At least one exam part (oral or written) is required");

  const supabase = await createSupabaseForUser(request);

  const { data: failed } = await supabase
    .from("exam_sessions")
    .select("id, mosque_id, student_profile_id, from_group_id, status")
    .eq("id", failedSessionId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("examiner_profile_id", ctx.teacherProfileId)
    .maybeSingle();

  if (!failed) return err("Failed session not found", 404);
  if (failed.status !== "failed")
    return err("A retake can only be proposed for a failed exam");

  const { data: inserted, error } = await supabase
    .from("exam_sessions")
    .insert({
      mosque_id: ctx.mosqueId,
      exam_request_id: null,
      student_profile_id: failed.student_profile_id,
      examiner_profile_id: ctx.teacherProfileId,
      from_group_id: failed.from_group_id,
      status: "proposed",
      schedule_status: "proposed",
      proposed_date: proposedDate,
      proposed_by: "examiner",
      oral_required: oralRequired,
      written_required: writtenRequired,
      retake_of_session_id: failedSessionId,
      exam_date: proposedDate,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id")
    .maybeSingle();

  if (error) return dbErr(error.message);

  if (inserted?.id) {
    const { enqueueExamNotifications, resolveExamRecipients } = await import(
      "@/lib/exam-notifications"
    );
    const r = await resolveExamRecipients(inserted.id);
    const recipients = [...r.parents, ...(r.student ? [r.student] : [])];
    await enqueueExamNotifications({
      mosqueId: ctx.mosqueId,
      recipientProfileIds: recipients,
      subject: `Prüfung: Nachprüfung vorgeschlagen am ${proposedDate}`,
      body: `Eine Nachprüfung wurde für ${proposedDate} vorgeschlagen.`,
    });
  }

  return ok({ retake_session_id: inserted?.id ?? null }, 201);
}
