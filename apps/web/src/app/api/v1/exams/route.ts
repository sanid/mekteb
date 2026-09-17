import { NextRequest } from "next/server";
import { requireApiExaminer, createSupabaseForUser } from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

export async function GET(request: NextRequest) {
  const ctx = await requireApiExaminer(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const [pendingResult, sessionsResult] = await Promise.all([
    supabase
      .from("exam_requests")
      .select(
        "id, notes, status, created_at, student_profiles(full_name), groups(name), teacher_profiles(profiles(full_name))",
      )
      .eq("mosque_id", ctx.mosqueId)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("exam_sessions")
      .select(
        "id, status, summary, exam_date, diploma_generated_at, schedule_status, proposed_date, proposed_by, oral_required, written_required, oral_passed, written_passed, retake_of_session_id, from_group_id, to_group_id, student_profiles(full_name), groups!exam_sessions_from_group_id_fkey(name)",
      )
      .eq("mosque_id", ctx.mosqueId)
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  if (pendingResult.error) return dbErr(pendingResult.error.message);
  if (sessionsResult.error) return dbErr(sessionsResult.error.message);

  return ok({
    pendingRequests: pendingResult.data,
    sessions: sessionsResult.data,
  });
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiExaminer(request);
  if (!ctx) return unauthorized();

  const body = await request.json();
  const requestId = String(body.request_id ?? "").trim();
  if (!requestId) return err("request_id is required");

  // A proposed date turns the session into a *proposal* the student/parent
  // must accept, mirroring the web `proposeExamSchedule` action. Without one
  // the session is created directly in progress, as this route always did —
  // older clients keep working unchanged.
  const proposedDate =
    typeof body.proposed_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.proposed_date)
      ? body.proposed_date
      : null;
  const oralRequired = Boolean(body.oral_required);
  const writtenRequired = Boolean(body.written_required);
  if (proposedDate && !oralRequired && !writtenRequired)
    return err("At least one exam part (oral or written) is required");

  const supabase = await createSupabaseForUser(request);

  const { data: examRequest } = await supabase
    .from("exam_requests")
    .select("id, mosque_id, student_profile_id, group_id, status")
    .eq("id", requestId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("status", "pending")
    .maybeSingle();

  if (!examRequest) return err("Request not found or already processed");

  const { error: reqError } = await supabase
    .from("exam_requests")
    .update({ status: "accepted" })
    .eq("id", requestId);

  if (reqError) return dbErr(reqError.message);

  const { data: session, error: sessionError } = await supabase
    .from("exam_sessions")
    .insert(
      proposedDate
        ? {
            mosque_id: ctx.mosqueId,
            exam_request_id: requestId,
            student_profile_id: examRequest.student_profile_id,
            examiner_profile_id: ctx.teacherProfileId,
            from_group_id: examRequest.group_id,
            status: "proposed",
            schedule_status: "proposed",
            proposed_date: proposedDate,
            proposed_by: "examiner",
            oral_required: oralRequired,
            written_required: writtenRequired,
            exam_date: proposedDate,
            created_by: ctx.userId,
            updated_by: ctx.userId,
          }
        : {
            mosque_id: ctx.mosqueId,
            exam_request_id: requestId,
            student_profile_id: examRequest.student_profile_id,
            examiner_profile_id: ctx.teacherProfileId,
            from_group_id: examRequest.group_id,
            status: "in_progress",
            created_by: ctx.userId,
            updated_by: ctx.userId,
          },
    )
    .select(
      "id, status, exam_date, proposed_date, proposed_by, schedule_status, oral_required, written_required, student_profiles(full_name), groups!exam_sessions_from_group_id_fkey(name)",
    )
    .single();

  if (sessionError) return dbErr(sessionError.message);

  if (proposedDate) {
    await notifyExamProposal(
      session.id,
      ctx.mosqueId,
      `Prüfung: vorgeschlagener Termin ${proposedDate}`,
      `Ein Prüfungstermin am ${proposedDate} wurde vorgeschlagen. Bitte bestätigen oder einen anderen Termin vorschlagen.`,
    );
  }

  return ok(session, 201);
}

/**
 * New-session notifications: the recipients live in the session's own links,
 * so this mirrors the web action's `notify` for the proposal step.
 */
async function notifyExamProposal(
  sessionId: string,
  mosqueId: string,
  subject: string,
  body: string,
): Promise<void> {
  const { resolveExamRecipients, enqueueExamNotifications } = await import(
    "@/lib/exam-notifications"
  );
  const r = await resolveExamRecipients(sessionId);
  const recipients: string[] = [];
  recipients.push(...r.parents);
  if (r.student) recipients.push(r.student);
  await enqueueExamNotifications({ mosqueId, recipientProfileIds: recipients, subject, body });
}
