import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiMember,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";
import {
  enqueueExamNotifications,
  resolveExamRecipients,
} from "@/lib/exam-notifications";
import { writeAuditLog } from "@/lib/audit";

/**
 * The student/parent side of exam scheduling: accept the proposed date,
 * counter-propose another, or cancel.
 *
 * `PATCH /exams/[id]` is the examiner's endpoint and rejects everyone else, so
 * without this the app could only *show* an exam. The web portals do the same
 * three things through server actions; both now go through the same two
 * database functions, so the rules cannot drift apart.
 *
 * Authorization is the functions' job — they resolve the caller to the student
 * or a linked parent and raise otherwise. This route deliberately does not
 * repeat that check, because a second copy is a second thing to get wrong.
 */
const schema = z
  .object({
    action: z.enum(["accept", "counter", "cancel"]),
    /** Required for `counter`; ignored otherwise. */
    counterDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "counterDate must be YYYY-MM-DD")
      .optional(),
  })
  .refine((v) => v.action !== "counter" || !!v.counterDate, {
    message: "counterDate is required when countering",
    path: ["counterDate"],
  });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const parsed = await parseJson(request, schema);
  if (!parsed.ok) return parsed.response;
  const { action, counterDate } = parsed.data;

  const supabase = createSupabaseForUser(request);

  if (action === "cancel") {
    const { error } = await supabase.rpc("cancel_exam_session", {
      p_session_id: sessionId,
    });
    if (error) return rpcErr(error.message);
  } else {
    const { error } = await supabase.rpc("respond_to_exam_schedule", {
      p_session_id: sessionId,
      p_action: action,
      ...(action === "counter" ? { p_counter_date: counterDate! } : {}),
    });
    if (error) return rpcErr(error.message);
  }

  await notify(sessionId, ctx.mosqueId, action, counterDate);

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: `exam.schedule_${action}`,
    targetTable: "exam_sessions",
    targetId: sessionId,
  });

  return ok({ action, sessionId });
}

/**
 * The functions raise plain messages; map the two the caller can act on to
 * real statuses instead of letting everything look like a server fault.
 */
function rpcErr(message: string) {
  if (message.includes("not authorized")) {
    return err("This exam is not yours to change", 403, "forbidden");
  }
  if (message.includes("session_not_found_or_completed")) {
    return err("This exam can no longer be cancelled", 409, "exam_not_pending");
  }
  return dbErr(message);
}

/**
 * Who hears about it mirrors the web actions exactly: an acceptance concerns
 * the examiner, a counter-proposal also concerns the teacher who nominated the
 * student, and a cancellation concerns everyone attached to the exam.
 */
async function notify(
  sessionId: string,
  mosqueId: string,
  action: "accept" | "counter" | "cancel",
  counterDate: string | undefined,
) {
  const r = await resolveExamRecipients(sessionId);

  const recipients =
    action === "accept"
      ? [r.examiner]
      : action === "counter"
        ? [r.examiner, r.requestingTeacher]
        : [r.examiner, r.requestingTeacher, ...r.parents, r.student];

  const { subject, body } =
    action === "accept"
      ? {
          subject: "Prüfung: Termin bestätigt",
          body: "Der vorgeschlagene Prüfungstermin wurde bestätigt.",
        }
      : action === "counter"
        ? {
            subject: `Prüfung: Gegenvorschlag ${counterDate}`,
            body: `Ein neuer Terminvorschlag ${counterDate} wurde gemacht.`,
          }
        : {
            subject: "Prüfung: Termin storniert",
            body: "Der Prüfungstermin wurde storniert.",
          };

  await enqueueExamNotifications({
    mosqueId,
    recipientProfileIds: recipients.filter((v): v is string => !!v),
    subject,
    body,
  });
}
