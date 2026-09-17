import { createAdminClient } from "@/lib/supabase/admin";

export type ExamNotifKind =
  | "exam_proposed"
  | "exam_confirmed"
  | "exam_counter"
  | "exam_result"
  | "exam_retake_proposed";

export async function enqueueExamNotifications(args: {
  mosqueId: string;
  recipientProfileIds: string[];
  subject: string;
  body: string;
  /** What happened, for the client to render in the reader's locale. */
  templateKey?: string;
  templateParams?: Record<string, string>;
}): Promise<void> {
  const recipients = Array.from(
    new Set(args.recipientProfileIds.filter((id): id is string => !!id)),
  );
  if (recipients.length === 0) return;
  const admin = createAdminClient();
  const rows = recipients.map((id) => ({
    mosque_id: args.mosqueId,
    recipient_profile_id: id,
    subject: args.subject,
    body: args.body,
    channel: "email" as const,
    // 'sent' = delivered to the in-app inbox. Without this the row defaults
    // to 'pending', which the email cron and the push sender both filter out —
    // exam/written-test notifications would only ever appear in the inbox.
    status: "sent" as const,
    ...(args.templateKey ? { template_key: args.templateKey } : {}),
    ...(args.templateParams ? { template_params: args.templateParams } : {}),
  }));
  await admin.from("notification_queue").insert(rows);
}

export type ExamRecipients = {
  parents: string[];
  student: string | null;
  examiner: string | null;
  requestingTeacher: string | null;
};

/**
 * Resolve recipient profile IDs for a given exam session.
 * Uses the service-role client so RLS does not interfere with parent/teacher
 * lookups across mosque-scoped tables.
 */
export async function resolveExamRecipients(sessionId: string): Promise<ExamRecipients> {
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("exam_sessions")
    .select("id, student_profile_id, examiner_profile_id, exam_request_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return { parents: [], student: null, examiner: null, requestingTeacher: null };
  }

  const [parentsRes, studentRes, examinerRes, requestRes] = await Promise.all([
    admin
      .from("parent_student_links")
      .select("parent_profiles(profile_id)")
      .eq("student_profile_id", session.student_profile_id),
    admin
      .from("student_profiles")
      .select("profile_id")
      .eq("id", session.student_profile_id)
      .maybeSingle(),
    admin
      .from("teacher_profiles")
      .select("profile_id")
      .eq("id", session.examiner_profile_id)
      .maybeSingle(),
    session.exam_request_id
      ? admin
          .from("exam_requests")
          .select("requested_by, teacher_profiles!exam_requests_requested_by_fkey(profile_id)")
          .eq("id", session.exam_request_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const parents = ((parentsRes.data ?? []) as Array<{
    parent_profiles: { profile_id: string | null } | null;
  }>)
    .map((r) => r.parent_profiles?.profile_id ?? null)
    .filter((v): v is string => !!v);

  const requestData = requestRes.data as
    | { teacher_profiles: { profile_id: string | null } | null }
    | null;

  return {
    parents,
    student: studentRes.data?.profile_id ?? null,
    examiner: examinerRes.data?.profile_id ?? null,
    requestingTeacher: requestData?.teacher_profiles?.profile_id ?? null,
  };
}
