import { createClient } from "@/lib/supabase/server";

export type GroupReport = {
  id: string;
  name: string;
  studentCount: number;
  attendanceRate: number | null;
  hwAckRate: number | null;
  lessonRate: number | null;
  examPassRate: number | null;
  examPassed: number;
  examFailed: number;
};

export type StudentReport = {
  id: string;
  fullName: string;
  attendanceRate: number | null;
  attendancePresent: number;
  attendanceTotal: number;
  lessonCompletionRate: number | null;
  lessonsCompleted: number;
  totalLessons: number;
  examsPassed: number;
  examsFailed: number;
};

export type ReportData = {
  mosqueName: string;
  schoolYearStart: string;
  generatedAt: string;
  totalStudents: number;
  totalGroups: number;
  totalTeachers: number;
  overallAttendanceRate: number | null;
  overallAttPresent: number;
  overallAttTotal: number;
  studentsAttendedOverHalf: number;
  overallExamPassRate: number | null;
  examPassed: number;
  examFailed: number;
  overallLessonRate: number | null;
  groups: GroupReport[];
  topStudents: StudentReport[];
};

export async function fetchReportData(
  mosqueId: string,
  since: string,
): Promise<ReportData> {
  const supabase = await createClient();

  const { data: mosque } = await supabase
    .from("mosques")
    .select("name")
    .eq("id", mosqueId)
    .maybeSingle();

  const [
    { count: totalStudents },
    { count: totalGroups },
    { count: totalTeachers },
    { data: allAttendance },
    { data: allGroupsRaw },
    { data: allLessons },
    { data: allExamSessions },
  ] = await Promise.all([
    supabase.from("student_profiles").select("*", { count: "exact", head: true }).eq("mosque_id", mosqueId).eq("is_active", true),
    supabase.from("groups").select("*", { count: "exact", head: true }).eq("mosque_id", mosqueId).eq("is_active", true),
    supabase.from("teacher_profiles").select("*", { count: "exact", head: true }).eq("mosque_id", mosqueId).eq("is_active", true),
    supabase
      .from("attendance_records")
      .select("student_profile_id, status, attendance_sessions!inner(session_date, mosque_id, group_id)")
      .eq("attendance_sessions.mosque_id", mosqueId)
      .gte("attendance_sessions.session_date", since),
    supabase
      .from("groups")
      .select("id, name, group_enrollments!group_enrollments_group_id_fkey(student_profile_id)")
      .eq("mosque_id", mosqueId)
      .eq("is_active", true),
    supabase.from("lessons").select("id").eq("mosque_id", mosqueId),
    supabase
      .from("exam_sessions")
      .select("student_profile_id, from_group_id, status")
      .eq("mosque_id", mosqueId)
      .in("status", ["passed", "failed"]),
  ]);

  const attRecords = allAttendance ?? [];
  const attPresent = attRecords.filter((r) => r.status === "present" || r.status === "late").length;
  const overallAttendanceRate = attRecords.length > 0 ? Math.round((attPresent / attRecords.length) * 100) : null;

  const studentAttMap = new Map<string, { present: number; total: number }>();
  for (const r of attRecords) {
    const cur = studentAttMap.get(r.student_profile_id) ?? { present: 0, total: 0 };
    cur.total++;
    if (r.status === "present" || r.status === "late") cur.present++;
    studentAttMap.set(r.student_profile_id, cur);
  }

  const studentsAttendedOverHalf = Array.from(studentAttMap.values()).filter(
    (s) => s.total > 0 && (s.present / s.total) >= 0.5,
  ).length;

  const exams = allExamSessions ?? [];
  const examPassed = exams.filter((e) => e.status === "passed").length;
  const examFailed = exams.filter((e) => e.status === "failed").length;
  const overallExamPassRate = (examPassed + examFailed) > 0 ? Math.round((examPassed / (examPassed + examFailed)) * 100) : null;

  const studentExamMap = new Map<string, { passed: number; failed: number }>();
  for (const e of exams) {
    const cur = studentExamMap.get(e.student_profile_id) ?? { passed: 0, failed: 0 };
    if (e.status === "passed") cur.passed++; else cur.failed++;
    studentExamMap.set(e.student_profile_id, cur);
  }

  const groupExamMap = new Map<string, { passed: number; failed: number }>();
  for (const e of exams) {
    const gid = e.from_group_id;
    if (!gid) continue;
    const cur = groupExamMap.get(gid) ?? { passed: 0, failed: 0 };
    if (e.status === "passed") cur.passed++; else cur.failed++;
    groupExamMap.set(gid, cur);
  }

  const totalLessonCount = (allLessons ?? []).length;

  const { data: completions } = await supabase
    .from("lesson_completions")
    .select("student_profile_id")
    .eq("mosque_id", mosqueId)
    .gte("created_at", since);

  const studentCompletionMap = new Map<string, number>();
  for (const c of completions ?? []) {
    studentCompletionMap.set(c.student_profile_id, (studentCompletionMap.get(c.student_profile_id) ?? 0) + 1);
  }

  const totalCompletions = (completions ?? []).length;
  const activeStudentCount = totalStudents ?? 0;
  const overallLessonRate = (totalLessonCount > 0 && activeStudentCount > 0)
    ? Math.round((totalCompletions / (totalLessonCount * activeStudentCount)) * 100)
    : null;

  const groups: GroupReport[] = (allGroupsRaw ?? []).map((g) => {
    const enrollments = g.group_enrollments as Array<{ student_profile_id: string }> | null;
    const studentIds = new Set((enrollments ?? []).map((e) => e.student_profile_id));
    const studentCount = studentIds.size;

    let gPresent = 0;
    let gTotal = 0;
    for (const r of attRecords) {
      const sess = r.attendance_sessions as { group_id: string } | null;
      if (sess?.group_id === g.id) {
        gTotal++;
        if (r.status === "present" || r.status === "late") gPresent++;
      }
    }
    const attendanceRate = gTotal > 0 ? Math.round((gPresent / gTotal) * 100) : null;

    let gCompletions = 0;
    for (const [sid, count] of studentCompletionMap.entries()) {
      if (studentIds.has(sid)) gCompletions += count;
    }
    const lessonRate = totalLessonCount > 0 && studentCount > 0
      ? Math.round((gCompletions / (totalLessonCount * studentCount)) * 100)
      : null;

    const gExam = groupExamMap.get(g.id) ?? { passed: 0, failed: 0 };
    const examPassRate = (gExam.passed + gExam.failed) > 0
      ? Math.round((gExam.passed / (gExam.passed + gExam.failed)) * 100)
      : null;

    return {
      id: g.id,
      name: g.name,
      studentCount,
      attendanceRate,
      hwAckRate: null,
      lessonRate,
      examPassRate,
      examPassed: gExam.passed,
      examFailed: gExam.failed,
    };
  });

  const { data: allStudentProfiles } = await supabase
    .from("student_profiles")
    .select("id, full_name")
    .eq("mosque_id", mosqueId)
    .eq("is_active", true);

  type ScoredStudent = StudentReport & { _score: number };

  const students: ScoredStudent[] = (allStudentProfiles ?? []).map((s) => {
    const att = studentAttMap.get(s.id);
    const attendanceRate = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null;

    const completed = studentCompletionMap.get(s.id) ?? 0;
    const lessonCompletionRate = totalLessonCount > 0 ? Math.round((completed / totalLessonCount) * 100) : null;

    const exam = studentExamMap.get(s.id) ?? { passed: 0, failed: 0 };

    const score = (attendanceRate ?? 0) + (lessonCompletionRate ?? 0) + (exam.passed * 10);

    return {
      id: s.id,
      fullName: s.full_name,
      attendanceRate,
      attendancePresent: att?.present ?? 0,
      attendanceTotal: att?.total ?? 0,
      lessonCompletionRate,
      lessonsCompleted: completed,
      totalLessons: totalLessonCount,
      examsPassed: exam.passed,
      examsFailed: exam.failed,
      _score: score,
    };
  });

  students.sort((a, b) => b._score - a._score);
  const topStudents: StudentReport[] = students.slice(0, 10).map(({ _score: _, ...rest }) => rest);

  groups.sort((a, b) => {
    const scoreA = (a.attendanceRate ?? 0) + (a.lessonRate ?? 0) + (a.examPassRate ?? 0);
    const scoreB = (b.attendanceRate ?? 0) + (b.lessonRate ?? 0) + (b.examPassRate ?? 0);
    return scoreB - scoreA;
  });

  return {
    mosqueName: mosque?.name ?? "Mosque",
    schoolYearStart: since,
    generatedAt: new Date().toISOString(),
    totalStudents: totalStudents ?? 0,
    totalGroups: totalGroups ?? 0,
    totalTeachers: totalTeachers ?? 0,
    overallAttendanceRate,
    overallAttPresent: attPresent,
    overallAttTotal: attRecords.length,
    studentsAttendedOverHalf,
    overallExamPassRate,
    examPassed,
    examFailed,
    overallLessonRate,
    groups,
    topStudents: topStudents as StudentReport[],
  };
}
