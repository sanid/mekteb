import { NextRequest } from "next/server";

import {
  extractUser,
  createSupabaseForUser,
  resolveApiRole,
} from "@/app/api/v1/helpers/api-auth";
import { okNoStore, unauthorized } from "@/app/api/v1/helpers/response";
import { activePluginsForRequest } from "@/app/api/v1/helpers/plugins";

/**
 * Everything the home-screen widgets show, in one request.
 *
 * A widget cannot call the API itself — it reads a payload the app wrote into
 * shared native storage (AGENTS.md §8) — so the app has to fetch this whenever
 * it is open, and the fewer round trips that takes the better. One endpoint
 * also means the widget's contents are defined server-side rather than
 * assembled from four screens' worth of client state.
 *
 * Deliberately raw values, not sentences: the app formats dates and picks
 * words in the reader's locale before handing anything to the widget, which
 * has no access to the message catalogue.
 *
 * Everything here is already visible to the caller elsewhere in the app; RLS
 * is what enforces that, exactly as on the screens.
 */
type Assignment = {
  id: string;
  title: string;
  dueDate: string | null;
  /** Whose homework it is — only set for parents, who see several children. */
  studentName?: string;
};

type NextLesson = { date: string; startTime: string | null; groupName: string | null };

export async function GET(request: NextRequest) {
  const user = await extractUser(request);
  if (!user || user.mustRotatePassword) return unauthorized();

  const role = await resolveApiRole(user.userId, request);
  const supabase = createSupabaseForUser(request);

  // "Today" in the mosque's day, not UTC: a lesson at 18:00 must not drop off
  // the widget at 01:00 local time because the server has already rolled over.
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  /** The next class meeting for a set of groups, cancellations excluded. */
  async function nextLesson(groupIds: string[]): Promise<NextLesson | null> {
    if (groupIds.length === 0) return null;
    const { data } = await supabase
      .from("teaching_sessions")
      .select("date, start_time, group_id, groups(name)")
      .in("group_id", groupIds)
      .gte("date", todayIso)
      .eq("is_cancelled", false)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(1);

    const row = data?.[0];
    if (!row) return null;
    return {
      date: row.date,
      startTime: row.start_time,
      groupName: (row.groups as { name: string } | null)?.name ?? null,
    };
  }

  /** Unacknowledged homework for one student, soonest due first. */
  async function openHomework(
    studentProfileId: string,
    groupIds: string[],
    limit: number,
  ): Promise<Assignment[]> {
    if (groupIds.length === 0) return [];
    const { data } = await supabase
      .from("homework_assignments")
      .select(
        "id, title, due_date, audience, created_at, homework_targets(student_profile_id), homework_submissions(student_profile_id, acknowledged_at)",
      )
      .in("group_id", groupIds)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(30);

    type Row = {
      id: string;
      title: string;
      due_date: string | null;
      audience: string;
      homework_targets: { student_profile_id: string }[];
      homework_submissions: {
        student_profile_id: string;
        acknowledged_at: string | null;
      }[];
    };

    return ((data ?? []) as unknown as Row[])
      .filter(
        (h) =>
          h.audience === "group" ||
          h.homework_targets.some((t) => t.student_profile_id === studentProfileId),
      )
      .filter(
        (h) =>
          !h.homework_submissions.some(
            (s) => s.student_profile_id === studentProfileId && s.acknowledged_at,
          ),
      )
      // A widget shows what is *next*, so a due date beats recency. Undated
      // homework sorts last rather than blocking the slot.
      .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
      .slice(0, limit)
      .map((h) => ({ id: h.id, title: h.title, dueDate: h.due_date }));
  }

  async function activeGroupIds(studentProfileId: string): Promise<string[]> {
    const { data } = await supabase
      .from("group_enrollments")
      .select("group_id")
      .eq("student_profile_id", studentProfileId)
      .eq("is_active", true);
    return (data ?? []).map((e) => e.group_id);
  }

  // ── Student ──────────────────────────────────────────────────────────────
  if (role === "student") {
    const { data: profile } = await supabase
      .from("student_profiles")
      .select("id, mosque_id")
      .eq("profile_id", user.userId)
      .eq("is_active", true)
      .maybeSingle();
    if (!profile) return unauthorized();

    const groupIds = await activeGroupIds(profile.id);
    const [assignments, lesson, hifz, plugins] = await Promise.all([
      openHomework(profile.id, groupIds, 1),
      nextLesson(groupIds),
      supabase
        .from("hifz_progress")
        .select("pages_memorized")
        .eq("student_profile_id", profile.id),
      activePluginsForRequest(request, profile.mosque_id),
    ]);

    // The plugin switch decides this, not the presence of rows: a mosque that
    // turns hifz off keeps its old `hifz_progress` rows, and `/student/hifz`
    // already 404s for them. The widget used to show the bar anyway.
    const hifzRows = plugins.has("quran_hifz") ? (hifz.data ?? []) : [];

    // Only students actually taking part have rows — the widget hides hifz
    // entirely for everyone else rather than showing a zero.
    const pages = hifzRows.reduce((n, r) => n + (r.pages_memorized ?? 0), 0);

    return okNoStore({
      role: "student",
      assignments,
      nextLesson: lesson,
      hifz: hifzRows.length ? { pagesMemorized: pages, pagesTotal: 604 } : null,
    });
  }

  // ── Parent ───────────────────────────────────────────────────────────────
  if (role === "parent") {
    const { data: parentProfile } = await supabase
      .from("parent_profiles")
      .select("id")
      .eq("profile_id", user.userId)
      .maybeSingle();
    if (!parentProfile) return unauthorized();

    const { data: links } = await supabase
      .from("parent_student_links")
      .select("student_profile_id, student_profiles(id, full_name)")
      .eq("parent_profile_id", parentProfile.id);

    const children = (links ?? [])
      .map((l) => l.student_profiles as unknown as { id: string; full_name: string } | null)
      .filter((c): c is { id: string; full_name: string } => !!c);

    const assignments: Assignment[] = [];
    const allGroupIds = new Set<string>();

    for (const child of children) {
      const groupIds = await activeGroupIds(child.id);
      groupIds.forEach((id) => allGroupIds.add(id));
      // One per child, so a parent of three sees each of them rather than
      // three assignments belonging to the busiest one.
      const open = await openHomework(child.id, groupIds, 1);
      for (const item of open) {
        assignments.push({ ...item, studentName: child.full_name });
      }
    }

    return okNoStore({
      role: "parent",
      assignments: assignments
        .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
        .slice(0, 3),
      nextLesson: await nextLesson([...allGroupIds]),
      hifz: null,
    });
  }

  // ── Teacher (and anyone else with groups) ────────────────────────────────
  const { data: teacherProfiles } = await supabase
    .from("teacher_profiles")
    .select("id")
    .eq("profile_id", user.userId);

  const teacherIds = (teacherProfiles ?? []).map((t) => t.id);
  let groupIds: string[] = [];
  if (teacherIds.length) {
    const { data: links } = await supabase
      .from("teacher_group_links")
      .select("group_id")
      .in("teacher_profile_id", teacherIds);
    groupIds = (links ?? []).map((l) => l.group_id);
  }

  return okNoStore({
    role: role ?? "member",
    assignments: [],
    nextLesson: await nextLesson(groupIds),
    hifz: null,
  });
}
