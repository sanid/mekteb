import { NextRequest } from "next/server";

import {
  requireApiExaminer,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

/**
 * The examiner accepts the date currently on the table — either their own
 * proposal the student/parent confirmed (which the student side already
 * settled via `respond_to_exam_schedule`) or a student/parent counter they
 * now agree with. Mirror of the web `examinerAcceptCounter` action: the
 * session becomes confirmed and scheduled with `proposed_date`.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  const ctx = await requireApiExaminer(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id, proposed_date")
    .eq("id", sessionId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("examiner_profile_id", ctx.teacherProfileId)
    .maybeSingle();

  if (!session) return err("Exam session not found", 404);
  if (!session.proposed_date) return err("No proposed date to accept");

  const { error } = await supabase
    .from("exam_sessions")
    .update({
      schedule_status: "confirmed",
      status: "scheduled",
      exam_date: session.proposed_date,
      updated_by: ctx.userId,
    })
    .eq("id", sessionId);
  if (error) return dbErr(error.message);

  const { enqueueExamNotifications, resolveExamRecipients } = await import(
    "@/lib/exam-notifications"
  );
  const r = await resolveExamRecipients(sessionId);
  const recipients = [...r.parents, ...(r.student ? [r.student] : [])];
  await enqueueExamNotifications({
    mosqueId: ctx.mosqueId,
    recipientProfileIds: recipients,
    subject: `Prüfung bestätigt: ${session.proposed_date}`,
    body: `Der Prüfungstermin ${session.proposed_date} wurde bestätigt.`,
  });

  return ok({ updated: true });
}
