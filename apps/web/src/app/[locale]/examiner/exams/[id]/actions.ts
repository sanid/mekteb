"use server";

import { revalidatePath } from "next/cache";

import { requireExaminer } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { computeExamResult, parseExamDate } from "@/lib/exam-scheduling";
import {
  enqueueExamNotifications,
  resolveExamRecipients,
} from "@/lib/exam-notifications";
import { dbActionErr, type ActionResult } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";


type ExamSessionRow = {
  id: string;
  mosque_id: string;
  student_profile_id: string;
  examiner_profile_id: string;
  from_group_id: string;
  status: string;
  schedule_status: string | null;
  proposed_date: string | null;
  exam_date: string;
  oral_required: boolean;
  written_required: boolean;
  exam_request_id: string | null;
};

async function notify(
  sessionId: string,
  mosqueId: string,
  subject: string,
  body: string,
  audience: Array<"parents" | "student" | "examiner" | "requestingTeacher">,
): Promise<void> {
  const r = await resolveExamRecipients(sessionId);
  const recipients: string[] = [];
  for (const a of audience) {
    if (a === "parents") recipients.push(...r.parents);
    else if (a === "student" && r.student) recipients.push(r.student);
    else if (a === "examiner" && r.examiner) recipients.push(r.examiner);
    else if (a === "requestingTeacher" && r.requestingTeacher)
      recipients.push(r.requestingTeacher);
  }
  await enqueueExamNotifications({
    mosqueId,
    recipientProfileIds: recipients,
    subject,
    body,
  });
}

// ---------------------------------------------------------------------------
// proposeExamSchedule — examiner accepts the request and proposes a date
// ---------------------------------------------------------------------------

export async function proposeExamSchedule(
  requestId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireExaminer();
  const supabase = await createClient();

  const proposedDate = parseExamDate(formData.get("proposed_date"));
  if (!proposedDate) return await actionError("proposed_date_required");

  const oralRequired = formData.get("oral_required") !== null;
  const writtenRequired = formData.get("written_required") !== null;
  if (!oralRequired && !writtenRequired)
    return await actionError("exam_part_required");

  const { data: request } = await supabase
    .from("exam_requests")
    .select("id, mosque_id, student_profile_id, group_id, status")
    .eq("id", requestId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("status", "pending")
    .maybeSingle();

  if (!request) return await actionError("request_not_found_or_processed");

  const { error: reqError } = await supabase
    .from("exam_requests")
    .update({ status: "accepted" })
    .eq("id", requestId);
  if (reqError) return await dbActionErr(reqError.message, "proposeExamSchedule");

  const insertPayload = {
    mosque_id: ctx.mosqueId,
    exam_request_id: requestId,
    student_profile_id: request.student_profile_id,
    examiner_profile_id: ctx.teacherProfileId,
    from_group_id: request.group_id,
    status: "proposed",
    schedule_status: "proposed",
    proposed_date: proposedDate,
    proposed_by: "examiner",
    oral_required: oralRequired,
    written_required: writtenRequired,
    exam_date: proposedDate,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  } as never;
  const { data: inserted, error: sessionError } = await supabase
    .from("exam_sessions")
    .insert(insertPayload)
    .select("id")
    .maybeSingle();

  if (sessionError) return await dbActionErr(sessionError.message, "proposeExamSchedule");
  if (inserted?.id) {
    await notify(
      inserted.id,
      ctx.mosqueId,
      `Prüfung: vorgeschlagener Termin ${proposedDate}`,
      `Ein Prüfungstermin am ${proposedDate} wurde vorgeschlagen. Bitte bestätigen oder einen anderen Termin vorschlagen.`,
      ["parents", "student"],
    );
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// examinerCounterDate — examiner proposes a new date (sends back to parents)
// ---------------------------------------------------------------------------

export async function examinerCounterDate(
  sessionId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireExaminer();
  const supabase = await createClient();

  const proposedDate = parseExamDate(formData.get("proposed_date"));
  if (!proposedDate) return await actionError("date_required");

  const updatePayload = {
    schedule_status: "proposed",
    proposed_date: proposedDate,
    proposed_by: "examiner",
    updated_by: ctx.userId,
  } as never;
  const { error } = await supabase
    .from("exam_sessions")
    .update(updatePayload)
    .eq("id", sessionId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("examiner_profile_id", ctx.teacherProfileId);

  if (error) return await dbActionErr(error.message, "examinerCounterDate");

  await notify(
    sessionId,
    ctx.mosqueId,
    `Prüfung: neuer Terminvorschlag ${proposedDate}`,
    `Der Prüfer hat den Termin ${proposedDate} vorgeschlagen.`,
    ["parents", "student"],
  );

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// examinerAcceptCounter — examiner accepts the counter-proposed date
// ---------------------------------------------------------------------------

export async function examinerAcceptCounter(
  sessionId: string,
): Promise<ActionResult> {
  const ctx = await requireExaminer();
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id, proposed_date")
    .eq("id", sessionId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("examiner_profile_id", ctx.teacherProfileId)
    .maybeSingle() as { data: { id: string; proposed_date: string | null } | null };

  if (!session) return await actionError("session_not_found");
  const date = session.proposed_date;
  if (!date) return await actionError("no_proposed_date");

  const acceptPayload = {
    schedule_status: "confirmed",
    status: "scheduled",
    exam_date: date,
    updated_by: ctx.userId,
  } as never;
  const { error } = await supabase
    .from("exam_sessions")
    .update(acceptPayload)
    .eq("id", sessionId);
  if (error) return await dbActionErr(error.message, "examinerAcceptCounter");

  await notify(
    sessionId,
    ctx.mosqueId,
    `Prüfung bestätigt: ${date}`,
    `Der Prüfungstermin ${date} wurde bestätigt.`,
    ["parents", "student"],
  );

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// startExamConducting — move from scheduled→in_progress
// ---------------------------------------------------------------------------

export async function startExamConducting(
  sessionId: string,
): Promise<ActionResult> {
  const ctx = await requireExaminer();
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id, status, schedule_status")
    .eq("id", sessionId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("examiner_profile_id", ctx.teacherProfileId)
    .maybeSingle() as { data: { id: string; status: string; schedule_status: string | null } | null };

  if (!session) return await actionError("session_not_found");
  if (session.schedule_status !== "confirmed")
    return await actionError("schedule_not_confirmed");

  const { error } = await supabase
    .from("exam_sessions")
    .update({ status: "in_progress", updated_by: ctx.userId })
    .eq("id", sessionId);

  if (error) return await dbActionErr(error.message, "startExamConducting");

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// completeExamSession — record oral/written results, optional promotion
// ---------------------------------------------------------------------------

export async function completeExamSession(
  sessionId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireExaminer();
  const supabase = await createClient();

  const summary = String(formData.get("summary") ?? "").trim() || null;
  const oralPassed = formData.get("oral_passed") !== null;
  const writtenPassed = formData.get("written_passed") !== null;
  const toGroupId = String(formData.get("to_group_id") ?? "").trim() || null;

  const { data: session } = await supabase
    .from("exam_sessions")
    .select(
      "id, mosque_id, student_profile_id, examiner_profile_id, from_group_id, status, exam_request_id, oral_required, written_required",
    )
    .eq("id", sessionId)
    .eq("examiner_profile_id", ctx.teacherProfileId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle() as { data: ExamSessionRow | null };

  if (!session) return await actionError("exam_session_not_found");
  if (session.status !== "in_progress" && session.status !== "scheduled")
    return await actionError("exam_session_not_in_progress");

  const oralRequired = !!session.oral_required;
  const writtenRequired = !!session.written_required;
  if (!oralRequired && !writtenRequired)
    return await actionError("exam_part_required");

  const result = computeExamResult({
    oralRequired,
    oralPassed,
    writtenRequired,
    writtenPassed,
  });

  if (result === "passed" && toGroupId) {
    const { data: targetGroup } = await supabase
      .from("groups")
      .select("id, mosque_id")
      .eq("id", toGroupId)
      .eq("mosque_id", ctx.mosqueId)
      .maybeSingle();
    if (!targetGroup) return await actionError("target_group_not_found");
  }

  const completePayload = {
    status: result,
    summary,
    oral_passed: oralRequired ? oralPassed : null,
    written_passed: writtenRequired ? writtenPassed : null,
    to_group_id: result === "passed" ? toGroupId : null,
    updated_by: ctx.userId,
  } as never;
  const { error: updateError } = await supabase
    .from("exam_sessions")
    .update(completePayload)
    .eq("id", sessionId);
  if (updateError) return await dbActionErr(updateError.message, "completeExamSession");

  if (result === "passed" && toGroupId) {
    const { error: endError } = await supabase
      .from("group_enrollments")
      .update({
        is_active: false,
        ended_at: new Date().toISOString().slice(0, 10),
        updated_by: ctx.userId,
      })
      .eq("student_profile_id", session.student_profile_id)
      .eq("group_id", session.from_group_id)
      .eq("is_active", true);
    if (endError)
      return await actionError("transfer_unenroll_failed");

    const { error: enrollError } = await supabase
      .from("group_enrollments")
      .insert({
        mosque_id: ctx.mosqueId,
        group_id: toGroupId,
        student_profile_id: session.student_profile_id,
        enrolled_at: new Date().toISOString().slice(0, 10),
        created_by: ctx.userId,
        updated_by: ctx.userId,
      });
    if (enrollError)
      return await actionError("transfer_enroll_failed");

    await writeAuditLog({
      mosqueId: ctx.mosqueId,
      actorUserId: ctx.userId,
      action: "exam.student_promoted",
      targetTable: "group_enrollments",
      targetId: session.student_profile_id,
      metadata: {
        from_group: session.from_group_id,
        to_group: toGroupId,
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

  await notify(
    sessionId,
    ctx.mosqueId,
    `Prüfung: Ergebnis ${result === "passed" ? "bestanden" : "nicht bestanden"}`,
    summary ?? "",
    ["parents", "student", "requestingTeacher"],
  );

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// proposeRetake — examiner creates a new session linked to a failed one
// ---------------------------------------------------------------------------

export async function proposeRetake(
  failedSessionId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireExaminer();
  const supabase = await createClient();

  const proposedDate = parseExamDate(formData.get("proposed_date"));
  if (!proposedDate) return await actionError("proposed_date_required");

  const oralRequired = formData.get("oral_required") !== null;
  const writtenRequired = formData.get("written_required") !== null;
  if (!oralRequired && !writtenRequired)
    return await actionError("exam_part_required");

  const { data: failed } = await supabase
    .from("exam_sessions")
    .select(
      "id, mosque_id, student_profile_id, from_group_id, status, examiner_profile_id",
    )
    .eq("id", failedSessionId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("examiner_profile_id", ctx.teacherProfileId)
    .maybeSingle() as {
      data: {
        id: string;
        mosque_id: string;
        student_profile_id: string;
        from_group_id: string;
        status: string;
        examiner_profile_id: string;
      } | null;
    };

  if (!failed) return await actionError("failed_session_not_found");
  if (failed.status !== "failed")
    return await actionError("original_must_be_failed_exam");

  const retakePayload = {
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
  } as never;
  const { data: inserted, error: insertError } = await supabase
    .from("exam_sessions")
    .insert(retakePayload)
    .select("id")
    .maybeSingle();

  if (insertError) return await dbActionErr(insertError.message, "proposeRetake");
  if (inserted?.id) {
    await notify(
      inserted.id,
      ctx.mosqueId,
      `Prüfung: Nachprüfung vorgeschlagen am ${proposedDate}`,
      `Eine Nachprüfung wurde für ${proposedDate} vorgeschlagen.`,
      ["parents", "student"],
    );
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// markDiplomaGenerated — unchanged
// ---------------------------------------------------------------------------

export async function markDiplomaGenerated(
  sessionId: string,
): Promise<ActionResult> {
  const ctx = await requireExaminer();
  const supabase = await createClient();

  const { error } = await supabase
    .from("exam_sessions")
    .update({
      diploma_generated_at: new Date().toISOString(),
      updated_by: ctx.userId,
    })
    .eq("id", sessionId)
    .eq("examiner_profile_id", ctx.teacherProfileId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("status", "passed");

  if (error) return await dbActionErr(error.message, "markDiplomaGenerated");

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// setLessonChecked — tick or untick one lesson during the oral exam
// ---------------------------------------------------------------------------

export async function setLessonChecked(
  sessionId: string,
  lessonId: string,
  passed: boolean,
): Promise<ActionResult> {
  const ctx = await requireExaminer();
  const supabase = await createClient();

  // Only the session's own examiner writes, and only while the result is not
  // terminal — a tick after the result was recorded would silently rewrite
  // what the teacher already saw.
  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id, mosque_id, status")
    .eq("id", sessionId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("examiner_profile_id", ctx.teacherProfileId)
    .maybeSingle();

  if (!session) return await actionError("exam_session_not_found");
  if (session.status === "passed" || session.status === "failed")
    return await actionError("exam_session_terminal");

  if (passed) {
    const { error } = await supabase.from("exam_lesson_results").upsert(
      {
        mosque_id: ctx.mosqueId,
        exam_session_id: sessionId,
        lesson_id: lessonId,
        passed: true,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
      { onConflict: "exam_session_id,lesson_id" },
    );
    if (error) return await dbActionErr(error.message, "setLessonChecked");
  } else {
    const { error } = await supabase
      .from("exam_lesson_results")
      .delete()
      .eq("exam_session_id", sessionId)
      .eq("lesson_id", lessonId);
    if (error) return await dbActionErr(error.message, "setLessonChecked");
  }

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: passed ? "exam.lesson_checked" : "exam.lesson_unchecked",
    targetTable: "exam_lesson_results",
    targetId: `${sessionId}:${lessonId}`,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
