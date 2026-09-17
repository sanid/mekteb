import { NextRequest } from "next/server";

import {
  requireApiExaminer,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

/**
 * The examiner's side of the schedule negotiation: a new proposal (calling
 * back a student/parent counter-proposal, or simply picking a different
 * date). Mirror of the web `examinerCounterDate` action.
 *
 * `oral_required` / `written_required` are only updated while the date is
 * still being agreed; once a session is confirmed they are fixed.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  const ctx = await requireApiExaminer(request);
  if (!ctx) return unauthorized();

  const body = await request.json();
  const proposedDate =
    typeof body.proposed_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.proposed_date)
      ? body.proposed_date
      : null;
  if (!proposedDate) return err("proposed_date is required (YYYY-MM-DD)");

  const supabase = await createSupabaseForUser(request);

  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id, schedule_status")
    .eq("id", sessionId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("examiner_profile_id", ctx.teacherProfileId)
    .maybeSingle();

  if (!session) return err("Exam session not found", 404);

  const { error } = await supabase
    .from("exam_sessions")
    .update({
      schedule_status: "proposed",
      proposed_date: proposedDate,
      proposed_by: "examiner",
      ...(typeof body.oral_required === "boolean"
        ? { oral_required: body.oral_required }
        : {}),
      ...(typeof body.written_required === "boolean"
        ? { written_required: body.written_required }
        : {}),
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
    subject: `Prüfung: neuer Terminvorschlag ${proposedDate}`,
    body: `Der Prüfer hat den Termin ${proposedDate} vorgeschlagen.`,
  });

  return ok({ updated: true });
}
