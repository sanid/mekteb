import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/**
 * One definition of "which lessons does this person see", shared by the web
 * portals and `/api/v1/calendar`.
 *
 * The two products ask the same question and must not answer it differently,
 * so the scoping rules live here rather than in either caller. The client is
 * passed in because the callers authenticate differently — the web has
 * cookies, the app a bearer token — and building the wrong one inside an API
 * route is a bug this codebase has already shipped once.
 *
 * Two scopes, both available to every role:
 *
 * - `mine` — the reader's own week: a student's groups, a parent's children's
 *   groups, a teacher's or examiner's taught groups. An admin has no groups of
 *   their own, so theirs is the mosque.
 * - `mosque` — everything on offer. Deliberately open to students and parents
 *   too: a family deciding whether to join the Saturday Hifz class has to be
 *   able to see that it exists.
 *
 * The narrowing happens here, explicitly, for **every** role. RLS deliberately
 * lets everyone read their own mosque's timetable
 * (`20260807000200_students_read_mosque_timetable`), so it can no longer be
 * relied on to scope a student.
 */

export type CalendarScope = "mine" | "mosque";

export type CalendarRole =
  | "mosque_admin"
  | "examiner"
  | "teacher"
  | "parent"
  | "student"
  | string;

export type CalendarSession = {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isCancelled: boolean;
  notes: string | null;
  groupId: string | null;
  /** Group name, or the category's when the session covers a whole category. */
  title: string | null;
  room: string | null;
  color: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
};

export type CalendarHoliday = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

export type CalendarWeek = {
  from: string;
  to: string;
  sessions: CalendarSession[];
  events: CalendarEvent[];
  holidays: CalendarHoliday[];
};

/** `YYYY-MM-DD` in local time — `toISOString()` shifts the day east of UTC. */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monday of the week containing `d`. Weeks start on Monday. */
export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return copy;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

type Client = SupabaseClient<Database>;

/** The groups a reader's personal calendar covers; null means the mosque. */
async function personalGroupIds(
  supabase: Client,
  userId: string,
  role: CalendarRole,
): Promise<string[] | null> {
  if (role === "student") {
    const { data: profile } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("profile_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    if (!profile) return [];

    const { data } = await supabase
      .from("group_enrollments")
      .select("group_id")
      .eq("student_profile_id", profile.id)
      .eq("is_active", true);
    return [...new Set((data ?? []).map((e) => e.group_id))];
  }

  if (role === "parent") {
    const { data: profile } = await supabase
      .from("parent_profiles")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();
    if (!profile) return [];

    const { data: links } = await supabase
      .from("parent_student_links")
      .select("student_profile_id")
      .eq("parent_profile_id", profile.id);
    const childIds = (links ?? []).map((l) => l.student_profile_id);
    if (!childIds.length) return [];

    const { data } = await supabase
      .from("group_enrollments")
      .select("group_id")
      .in("student_profile_id", childIds)
      .eq("is_active", true);
    return [...new Set((data ?? []).map((e) => e.group_id))];
  }

  // An examiner is staff with groups of their own; same rule as a teacher.
  if (role === "teacher" || role === "examiner") {
    const { data: profiles } = await supabase
      .from("teacher_profiles")
      .select("id")
      .eq("profile_id", userId);
    const teacherIds = (profiles ?? []).map((p) => p.id);
    if (!teacherIds.length) return [];

    const { data } = await supabase
      .from("teacher_group_links")
      .select("group_id")
      .in("teacher_profile_id", teacherIds);
    return [...new Set((data ?? []).map((l) => l.group_id))];
  }

  // Admins and platform owners: the mosque is their calendar.
  return null;
}

export async function loadCalendarWeek({
  supabase,
  userId,
  mosqueId,
  role,
  from,
  to,
  scope = "mine",
}: {
  supabase: Client;
  userId: string;
  mosqueId: string;
  role: CalendarRole;
  from: string;
  to: string;
  scope?: CalendarScope;
}): Promise<CalendarWeek> {
  const groupIds =
    scope === "mosque" ? null : await personalGroupIds(supabase, userId, role);

  // A teacher with no groups or a parent with no enrolled children has an
  // empty timetable — but the mosque's events and holidays still apply.
  const noGroups = groupIds !== null && groupIds.length === 0;

  /** Categories those groups belong to, for category-wide sessions. */
  let categoryIds: string[] = [];
  if (groupIds !== null && groupIds.length > 0) {
    const { data } = await supabase
      .from("groups")
      .select("category_id")
      .in("id", groupIds);
    categoryIds = [
      ...new Set(
        (data ?? []).map((g) => g.category_id).filter((id): id is string => !!id),
      ),
    ];
  }

  // Labels come from `group_directory`, not an embedded `groups(...)` join.
  // `groups_select` only lets a reader see the groups they are attached to, so
  // in the mosque scope every unfamiliar lesson came back with a null name and
  // rendered as a generic "Lesson" — useless for exactly the person browsing
  // what the mosque offers. The view exposes names and rooms only.
  let sessionsQuery = supabase
    .from("teaching_sessions")
    .select(
      "id, date, start_time, end_time, is_cancelled, notes, group_id, category_id, group_categories(name, color)",
    )
    .eq("mosque_id", mosqueId)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  // Sessions attach to a group *or* to a whole category (the older
  // `teaching_schedules` shape). Match both, or category-wide lessons vanish
  // for exactly the people who attend them.
  if (groupIds !== null && groupIds.length > 0) {
    sessionsQuery =
      categoryIds.length > 0
        ? sessionsQuery.or(
            `group_id.in.(${groupIds.join(",")}),and(group_id.is.null,category_id.in.(${categoryIds.join(",")}))`,
          )
        : sessionsQuery.in("group_id", groupIds);
  }

  const [sessionsResult, mosqueResult, eventsResult] = await Promise.all([
    noGroups ? Promise.resolve({ data: [] }) : sessionsQuery,
    supabase.from("mosques").select("state").eq("id", mosqueId).maybeSingle(),
    supabase
      .from("calendar_events")
      .select("id, title, description, date, start_time, end_time")
      .eq("mosque_id", mosqueId)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true }),
  ]);

  const state = (mosqueResult.data as { state?: string | null } | null)?.state;
  const { data: holidays } = state
    ? await supabase
        .from("school_holidays")
        .select("id, name, start_date, end_date")
        .eq("state", state)
        // Overlap, not containment: a holiday starting before the window and
        // ending inside it still makes this week quiet.
        .lte("start_date", to)
        .gte("end_date", from)
    : { data: [] };

  type SessionRow = {
    id: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    is_cancelled: boolean;
    notes: string | null;
    group_id: string | null;
    group_categories: { name: string; color: string | null } | null;
  };

  const rows = (sessionsResult.data ?? []) as unknown as SessionRow[];

  const seenGroupIds = [
    ...new Set(rows.map((r) => r.group_id).filter((id): id is string => !!id)),
  ];
  const directory = new Map<string, { name: string; room: string | null }>();
  if (seenGroupIds.length) {
    const { data } = await supabase
      .from("group_directory")
      .select("id, name, room")
      .in("id", seenGroupIds);
    for (const g of data ?? []) {
      if (g.id) directory.set(g.id, { name: g.name ?? "", room: g.room });
    }
  }

  return {
    from,
    to,
    sessions: rows.map((s) => {
      const group = s.group_id ? directory.get(s.group_id) : undefined;
      return {
        id: s.id,
        date: s.date,
        startTime: s.start_time,
        endTime: s.end_time,
        isCancelled: s.is_cancelled,
        notes: s.notes,
        groupId: s.group_id,
        // A category-wide session has no group; its category name is the best
        // label the reader has ("Mekteb", not a blank row).
        title: group?.name ?? s.group_categories?.name ?? null,
        room: group?.room ?? null,
        color: s.group_categories?.color ?? null,
      };
    }),
    events: (eventsResult.data ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date,
      startTime: e.start_time,
      endTime: e.end_time,
    })),
    holidays: (holidays ?? []).map((h) => ({
      id: h.id,
      name: h.name,
      startDate: h.start_date,
      endDate: h.end_date,
    })),
  };
}
