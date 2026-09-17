"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  enqueueExamNotifications,
  resolveExamRecipients,
} from "@/lib/exam-notifications";
import { dbActionErr, type ActionResult } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";


async function getSessionMosque(sessionId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_sessions")
    .select("mosque_id")
    .eq("id", sessionId)
    .maybeSingle();
  return data?.mosque_id ?? null;
}

function parseDate(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

export async function acceptExamSchedule(
  sessionId: string,
): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.rpc("respond_to_exam_schedule", {
    p_session_id: sessionId,
    p_action: "accept",
  });
  if (error) return await dbActionErr(error.message, "acceptExamSchedule");

  const mosqueId = await getSessionMosque(sessionId);
  if (mosqueId) {
    const r = await resolveExamRecipients(sessionId);
    await enqueueExamNotifications({
      mosqueId,
      recipientProfileIds: [r.examiner].filter((v): v is string => !!v),
      subject: "Prüfung: Termin bestätigt",
      body: "Der vorgeschlagene Prüfungstermin wurde bestätigt.",
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function counterExamSchedule(
  sessionId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();

  const counterDate = parseDate(formData.get("counter_date"));
  if (!counterDate) return await actionError("counter_date_required");

  const { error } = await supabase.rpc("respond_to_exam_schedule", {
    p_session_id: sessionId,
    p_action: "counter",
    p_counter_date: counterDate,
  });
  if (error) return await dbActionErr(error.message, "counterExamSchedule");

  const mosqueId = await getSessionMosque(sessionId);
  if (mosqueId) {
    const r = await resolveExamRecipients(sessionId);
    const recipients = [r.examiner, r.requestingTeacher].filter(
      (v): v is string => !!v,
    );
    await enqueueExamNotifications({
      mosqueId,
      recipientProfileIds: recipients,
      subject: `Prüfung: Gegenvorschlag ${counterDate}`,
      body: `Ein neuer Terminvorschlag ${counterDate} wurde gemacht.`,
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function cancelExamSession(
  sessionId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id, status, mosque_id")
    .eq("id", sessionId)
    .in("status", ["proposed", "scheduled"])
    .maybeSingle();

  if (!session) return await actionError("session_not_found_or_completed");

  /**
   * Through the RPC, not a direct update: `exam_sessions` has no UPDATE policy
   * for parents or students, so the update this used to run matched zero rows
   * and still reported success — the dialog closed and the exam stayed
   * scheduled. Widening the policy instead would let a student write any
   * column on the row, including the result.
   */
  const { error } = await supabase.rpc("cancel_exam_session", {
    p_session_id: sessionId,
  });

  if (error) return await dbActionErr(error.message, "cancelExamSession");

  const r = await resolveExamRecipients(sessionId);
  const recipients = [
    r.examiner,
    r.requestingTeacher,
    ...r.parents,
    r.student,
  ].filter((v): v is string => !!v);

  await enqueueExamNotifications({
    mosqueId: session.mosque_id,
    recipientProfileIds: recipients,
    subject: "Prüfung: Termin storniert",
    body: "Der Prüfungstermin wurde storniert.",
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
