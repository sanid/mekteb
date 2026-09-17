import { createAdminClient } from "@/lib/supabase/admin";
import { sendReportCardEmail } from "@/lib/email";
import { renderReportCard } from "@/lib/report-card-pdf";

type Admin = ReturnType<typeof createAdminClient>;

export type StudentReportCard = {
  fullName: string;
  since: string;
  groups: string[];
  attendancePresent: number;
  attendanceTotal: number;
  attendanceRate: number | null;
  hifz: { groupName: string; pages: number }[];
  examsPassed: number;
  examsFailed: number;
  lessonsCompleted: number;
  totalLessons: number;
};

export async function fetchStudentReport(
  admin: Admin,
  mosqueId: string,
  studentId: string,
  since: string,
  fullName: string,
  totalLessons: number,
): Promise<StudentReportCard> {
  const [{ data: enrollments }, { data: attendance }, { data: hifz }, { data: exams }, { data: completions }] =
    await Promise.all([
      admin.from("group_enrollments").select("groups(name)").eq("student_profile_id", studentId),
      admin
        .from("attendance_records")
        .select("status, attendance_sessions!inner(session_date, mosque_id)")
        .eq("student_profile_id", studentId)
        .eq("attendance_sessions.mosque_id", mosqueId)
        .gte("attendance_sessions.session_date", since),
      admin.from("hifz_progress").select("pages_memorized, groups(name)").eq("student_profile_id", studentId),
      admin.from("exam_sessions").select("status").eq("student_profile_id", studentId).in("status", ["passed", "failed"]),
      admin.from("lesson_completions").select("id").eq("student_profile_id", studentId).gte("created_at", since),
    ]);

  const att = attendance ?? [];
  const present = att.filter((r) => r.status === "present" || r.status === "late").length;
  const total = att.length;

  return {
    fullName,
    since,
    groups: (enrollments ?? [])
      .map((e) => (e.groups as { name: string } | null)?.name)
      .filter((n): n is string => Boolean(n)),
    attendancePresent: present,
    attendanceTotal: total,
    attendanceRate: total > 0 ? Math.round((present / total) * 100) : null,
    hifz: (hifz ?? []).map((h) => ({
      groupName: (h.groups as { name: string } | null)?.name ?? "",
      pages: h.pages_memorized,
    })),
    examsPassed: (exams ?? []).filter((e) => e.status === "passed").length,
    examsFailed: (exams ?? []).filter((e) => e.status === "failed").length,
    lessonsCompleted: (completions ?? []).length,
    totalLessons,
  };
}

/** Resolve auth-user emails for a set of profile ids (paginated). */
async function emailMap(admin: Admin, profileIds: Set<string>): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (profileIds.size === 0) return map;
  const PER_PAGE = 1000;
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error || !data) break;
    for (const u of data.users) {
      if (profileIds.has(u.id) && u.email) map.set(u.id, u.email);
    }
    if (data.users.length < PER_PAGE || map.size >= profileIds.size) break;
    page++;
  }
  return map;
}

export type SendSummary = { processed: number; emailed: number; skipped: number; failed: number };

/**
 * Generate + email report cards for one mosque's active students to their
 * linked parents. Idempotent per (student, period) via report_card_sends:
 * already-sent students are skipped unless `force` is set.
 */
export async function sendReportCardsForMosque(
  mosqueId: string,
  since: string,
  locale: string,
  opts: { force?: boolean; limit?: number } = {},
): Promise<SendSummary> {
  const admin = createAdminClient();
  const summary: SendSummary = { processed: 0, emailed: 0, skipped: 0, failed: 0 };

  const [{ data: mosque }, { data: students }, { count: totalLessons }, { data: alreadySent }] = await Promise.all([
    admin.from("mosques").select("name").eq("id", mosqueId).maybeSingle(),
    admin.from("student_profiles").select("id, full_name").eq("mosque_id", mosqueId).eq("is_active", true),
    admin.from("lessons").select("*", { count: "exact", head: true }).eq("mosque_id", mosqueId),
    admin.from("report_card_sends").select("student_profile_id").eq("mosque_id", mosqueId).eq("period_start", since),
  ]);

  const mosqueName = mosque?.name ?? "Mekteb";
  const sentSet = new Set((alreadySent ?? []).map((r) => r.student_profile_id));
  const queue = (students ?? [])
    .filter((s) => opts.force || !sentSet.has(s.id))
    .slice(0, opts.limit ?? 200);

  if (queue.length === 0) return summary;

  // Resolve parent emails for the whole queue in one pass.
  const studentIds = queue.map((s) => s.id);
  const { data: links } = await admin
    .from("parent_student_links")
    .select("student_profile_id, parent_profiles(profile_id)")
    .in("student_profile_id", studentIds);

  const parentsByStudent = new Map<string, string[]>();
  const allProfileIds = new Set<string>();
  for (const l of links ?? []) {
    const pid = (l.parent_profiles as { profile_id: string } | null)?.profile_id;
    if (!pid) continue;
    allProfileIds.add(pid);
    const arr = parentsByStudent.get(l.student_profile_id) ?? [];
    arr.push(pid);
    parentsByStudent.set(l.student_profile_id, arr);
  }

  const emails = await emailMap(admin, allProfileIds);

  for (const student of queue) {
    summary.processed++;
    const recipientEmails = (parentsByStudent.get(student.id) ?? [])
      .map((pid) => emails.get(pid))
      .filter((e): e is string => Boolean(e));

    if (recipientEmails.length === 0) {
      summary.skipped++;
      continue;
    }

    try {
      const data = await fetchStudentReport(admin, mosqueId, student.id, since, student.full_name, totalLessons ?? 0);
      const pdf = await renderReportCard(data, mosqueName, locale);
      for (const to of recipientEmails) {
        await sendReportCardEmail({ to, childName: student.full_name, mosqueName, locale, pdf });
        summary.emailed++;
      }
      await admin
        .from("report_card_sends")
        .upsert(
          { mosque_id: mosqueId, student_profile_id: student.id, period_start: since, recipients: recipientEmails.length },
          { onConflict: "student_profile_id,period_start" },
        );
    } catch {
      summary.failed++;
    }
  }

  return summary;
}
