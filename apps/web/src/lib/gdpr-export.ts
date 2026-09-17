import { createAdminClient } from "@/lib/supabase/admin";

export async function buildUserExport(userId: string) {
  const admin = createAdminClient();
  const generatedAt = new Date().toISOString();

  const [
    auth,
    profile,
    memberships,
    teacherProfiles,
    parentProfiles,
    studentProfiles,
    messageParticipations,
    messagesAuthored,
    notifications,
    loginAudit,
    auditLogsAsActor,
    gdprRequests,
  ] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin.from("memberships").select("*").eq("user_id", userId),
    admin.from("teacher_profiles").select("*").eq("profile_id", userId),
    admin.from("parent_profiles").select("*").eq("profile_id", userId),
    admin.from("student_profiles").select("*").eq("profile_id", userId),
    admin
      .from("message_participants")
      .select("*")
      .eq("profile_id", userId),
    admin.from("messages").select("*").eq("author_profile_id", userId),
    admin
      .from("notification_queue")
      .select("*")
      .eq("recipient_profile_id", userId),
    admin.from("login_audit").select("*").eq("user_id", userId),
    admin.from("audit_logs").select("*").eq("actor_user_id", userId),
    admin.from("gdpr_requests").select("*").eq("user_id", userId),
  ]);

  const studentIds = (studentProfiles.data ?? []).map((s) => s.id);
  const teacherIds = (teacherProfiles.data ?? []).map((t) => t.id);
  const parentIds = (parentProfiles.data ?? []).map((p) => p.id);

  const [childLinks, enrollments, attendance, homeworkTargets, homeworkSubmissions, progressNotes, lessonCompletions] =
    studentIds.length > 0 || parentIds.length > 0
      ? await Promise.all([
          parentIds.length > 0 || studentIds.length > 0
            ? admin
                .from("parent_student_links")
                .select("id, mosque_id, parent_profile_id, student_profile_id, is_primary, created_at")
                // One combined filter: a row matches when EITHER side is one
                // of the user's profiles. Two separate .or() calls would be
                // ANDed by PostgREST and match nothing.
                .or([
                  ...parentIds.map((id) => `parent_profile_id.eq.${id}`),
                  ...studentIds.map((id) => `student_profile_id.eq.${id}`),
                ].join(","))
            : Promise.resolve({ data: [] as never[] }),
          studentIds.length > 0
            ? admin.from("group_enrollments").select("*").in("student_profile_id", studentIds)
            : Promise.resolve({ data: [] as never[] }),
          studentIds.length > 0
            ? admin.from("attendance_records").select("*").in("student_profile_id", studentIds)
            : Promise.resolve({ data: [] as never[] }),
          studentIds.length > 0
            ? admin.from("homework_targets").select("*").in("student_profile_id", studentIds)
            : Promise.resolve({ data: [] as never[] }),
          studentIds.length > 0
            ? admin.from("homework_submissions").select("*").in("student_profile_id", studentIds)
            : Promise.resolve({ data: [] as never[] }),
          studentIds.length > 0
            ? admin.from("progress_notes").select("*").in("student_profile_id", studentIds)
            : Promise.resolve({ data: [] as never[] }),
          studentIds.length > 0
            ? admin.from("lesson_completions").select("*").in("student_profile_id", studentIds)
            : Promise.resolve({ data: [] as never[] }),
        ])
      : await Promise.all([
          Promise.resolve({ data: [] as never[] }),
          Promise.resolve({ data: [] as never[] }),
          Promise.resolve({ data: [] as never[] }),
          Promise.resolve({ data: [] as never[] }),
          Promise.resolve({ data: [] as never[] }),
          Promise.resolve({ data: [] as never[] }),
          Promise.resolve({ data: [] as never[] }),
        ]);

  return {
    generated_at: generatedAt,
    user_id: userId,
    notice:
      "This export was generated on your request under the GDPR / DSGVO. " +
      "It contains all personal data we hold about you. " +
      "Please keep this file confidential.",
    auth_user: auth.data?.user
      ? {
          id: auth.data.user.id,
          email: auth.data.user.email,
          created_at: auth.data.user.created_at,
          last_sign_in_at: auth.data.user.last_sign_in_at,
          email_confirmed_at: auth.data.user.email_confirmed_at,
          phone: auth.data.user.phone,
        }
      : null,
    profile: profile.data ?? null,
    memberships: memberships.data ?? [],
    teacher_profiles: teacherProfiles.data ?? [],
    parent_profiles: parentProfiles.data ?? [],
    student_profiles: studentProfiles.data ?? [],
    parent_student_links: childLinks.data ?? [],
    group_enrollments: enrollments.data ?? [],
    attendance_records: attendance.data ?? [],
    homework_targets: homeworkTargets.data ?? [],
    homework_submissions: homeworkSubmissions.data ?? [],
    progress_notes: progressNotes.data ?? [],
    lesson_completions: lessonCompletions.data ?? [],
    message_participations: messageParticipations.data ?? [],
    messages_authored: messagesAuthored.data ?? [],
    notifications: notifications.data ?? [],
    login_audit: loginAudit.data ?? [],
    audit_logs_as_actor: auditLogsAsActor.data ?? [],
    gdpr_requests: gdprRequests.data ?? [],
    _meta: {
      teacher_profile_ids: teacherIds,
      parent_profile_ids: parentIds,
      student_profile_ids: studentIds,
    },
  };
}

export type UserExport = Awaited<ReturnType<typeof buildUserExport>>;
