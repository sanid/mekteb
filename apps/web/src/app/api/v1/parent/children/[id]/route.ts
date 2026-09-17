import { NextRequest } from "next/server";

import {
  requireApiParent,
  createSupabaseForUser,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import { ok, unauthorized, notFound, err, dbErr } from "@/app/api/v1/helpers/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireApiParent(request);
  if (!ctx) return unauthorized();

  const { id: studentProfileId } = await params;
  const supabase = await createSupabaseForUser(request);

  const { data: link } = await supabase
    .from("parent_student_links")
    .select("id")
    .eq("parent_profile_id", ctx.parentProfileId)
    .eq("student_profile_id", studentProfileId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!link) return err("Not authorized for this child", 403);

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id, full_name, date_of_birth, is_active")
    .eq("id", studentProfileId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!student) return notFound("Child not found");

  const [{ data: enrollments }, { data: notes }, { data: exams }] = await Promise.all([
    supabase
      .from("group_enrollments")
      .select("id, group_id, groups(id, name)")
      .eq("student_profile_id", studentProfileId)
      .eq("is_active", true),
    supabase
      .from("progress_notes")
      .select("id, body, created_at, group_id")
      .eq("student_profile_id", studentProfileId)
      .eq("mosque_id", ctx.mosqueId)
      .eq("visible_to_parents", true)
      .order("created_at", { ascending: false })
      .limit(50),
    /**
     * Exams, so a parent can answer a proposed date from the app. RLS narrows
     * this to sessions the caller is linked to (`parent_has_exam_session`); the
     * student filter below is about *which child* is on screen.
     */
    supabase
      .from("exam_sessions")
      .select(
        "id, status, summary, exam_date, schedule_status, proposed_date, proposed_by",
      )
      .eq("student_profile_id", studentProfileId)
      .eq("mosque_id", ctx.mosqueId)
      .order("exam_date", { ascending: false })
      .limit(50),
  ]);

  const typedEnroll = (enrollments ?? []) as unknown as Array<{
    id: string;
    group_id: string;
    groups: { id: string; name: string } | null;
  }>;
  const groupIds = typedEnroll.map((e) => e.group_id);

  let homework: Array<{
    id: string;
    title: string;
    body: string | null;
    dueDate: string | null;
    groupId: string;
    acknowledgedAt: string | null;
  }> = [];

  let attendance: Array<{
    sessionId: string;
    sessionDate: string;
    status: string;
  }> = [];

  if (groupIds.length > 0) {
    /**
     * `homework_submissions`, not `homework_acknowledgements` — no such table
     * has ever existed. PostgREST rejected the whole select, and because the
     * error was discarded the route quietly returned an empty homework list:
     * every parent saw "no homework" no matter what the teacher had set.
     */
    const { data: hw, error: hwError } = await supabase
      .from("homework_assignments")
      .select(
        "id, title, body, due_date, group_id, audience, homework_targets(student_profile_id), homework_submissions(student_profile_id, acknowledged_at)",
      )
      .in("group_id", groupIds)
      .order("created_at", { ascending: false })
      .limit(50);
    if (hwError) return dbErr(hwError.message);

    const typedHw = (hw ?? []) as unknown as Array<{
      id: string;
      title: string;
      body: string | null;
      due_date: string | null;
      group_id: string;
      audience: string;
      homework_targets: Array<{ student_profile_id: string }>;
      homework_submissions: Array<{
        student_profile_id: string;
        acknowledged_at: string;
      }>;
    }>;

    homework = typedHw
      .filter((h) =>
        h.audience === "group" ||
        h.homework_targets.some((t) => t.student_profile_id === studentProfileId),
      )
      .map((h) => ({
        id: h.id,
        title: h.title,
        body: h.body,
        dueDate: h.due_date,
        groupId: h.group_id,
        acknowledgedAt:
          h.homework_submissions.find(
            (a) => a.student_profile_id === studentProfileId,
          )?.acknowledged_at ?? null,
      }));

    const { data: records } = await supabase
      .from("attendance_records")
      .select(
        "status, attendance_sessions!inner(id, session_date, group_id)",
      )
      .eq("student_profile_id", studentProfileId)
      .in("attendance_sessions.group_id", groupIds)
      .order("session_date", {
        ascending: false,
        referencedTable: "attendance_sessions",
      })
      .limit(60);

    const typedRecords = (records ?? []) as unknown as Array<{
      status: string;
      attendance_sessions: {
        id: string;
        session_date: string;
      } | null;
    }>;

    attendance = typedRecords
      .filter((r) => r.attendance_sessions !== null)
      .map((r) => ({
        sessionId: r.attendance_sessions!.id,
        sessionDate: r.attendance_sessions!.session_date,
        status: r.status,
      }));
  }

  // Written tests are not readable by parents through RLS (the web is token-
  // based), so the admin client is used — the parent is already authorised
  // for this child by the link check at the top.
  const admin = createSupabaseAdmin();
  const { data: writtenTests, error: writtenErr } = await admin
    .from("written_tests")
    .select(
      "id, title, status, created_at, overall_result, examiner_note, exam_session_id, exam_sessions(id, status, exam_date)",
    )
    .eq("student_profile_id", studentProfileId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (writtenErr) return dbErr(writtenErr.message);

  return ok({
    student: {
      id: student.id,
      fullName: student.full_name,
      dateOfBirth: student.date_of_birth,
      isActive: student.is_active,
    },
    groups: typedEnroll.map((e) => ({
      enrollmentId: e.id,
      groupId: e.group_id,
      groupName: e.groups?.name ?? "",
    })),
    homework,
    attendance,
    exams: exams ?? [],
    notes: (notes ?? []).map((n) => ({
      id: n.id,
      body: n.body,
      createdAt: n.created_at,
      groupId: n.group_id,
    })),
    writtenTests: (writtenTests ?? []).map((w) => ({
      id: w.id,
      title: w.title,
      status: w.status,
      createdAt: w.created_at,
      overallResult: w.overall_result,
      examinerNote: w.examiner_note,
      exam: w.exam_sessions
        ? {
            status: w.exam_sessions.status,
            examDate: w.exam_sessions.exam_date,
          }
        : null,
    })),
  });
}
