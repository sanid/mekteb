import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiMember,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import {
  ok,
  okNoStore,
  err,
  dbErr,
  unauthorized,
  notFound,
} from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";
import { writeAuditLog } from "@/lib/audit";

const MAX_OPEN_MS = 12 * 60 * 60 * 1000; // tokens auto-expire after 12h

type SessionRow = {
  id: string;
  mosque_id: string;
  group_id: string;
  session_date: string;
  checkin_active: boolean;
  checkin_opened_at: string | null;
};

/** Resolves the token to a live session, or null (unknown / closed / expired). */
async function resolveSession(
  admin: ReturnType<typeof createSupabaseAdmin>,
  token: string,
): Promise<SessionRow | null> {
  const { data } = await admin
    .from("attendance_sessions")
    .select("id, mosque_id, group_id, session_date, checkin_active, checkin_opened_at")
    .eq("checkin_token", token)
    .maybeSingle();
  if (!data || !data.checkin_active) return null;
  if (
    data.checkin_opened_at &&
    Date.now() - new Date(data.checkin_opened_at).getTime() > MAX_OPEN_MS
  ) {
    return null;
  }
  return data as SessionRow;
}

/**
 * Students the signed-in user may check in for this session: their own
 * student profile (if a student) or their linked children (if a parent),
 * limited to those enrolled in the session's group. Mirrors the web
 * `eligibleStudents` helper in `checkin/[token]/actions.ts`.
 */
async function eligibleStudents(
  admin: ReturnType<typeof createSupabaseAdmin>,
  userId: string,
  session: SessionRow,
): Promise<{ id: string; full_name: string }[]> {
  const candidates = new Set<string>();

  const { data: ownStudent } = await admin
    .from("student_profiles")
    .select("id")
    .eq("profile_id", userId)
    .eq("mosque_id", session.mosque_id)
    .eq("is_active", true)
    .maybeSingle();
  if (ownStudent) candidates.add(ownStudent.id);

  const { data: parent } = await admin
    .from("parent_profiles")
    .select("id")
    .eq("profile_id", userId)
    .eq("mosque_id", session.mosque_id)
    .eq("is_active", true)
    .maybeSingle();
  if (parent) {
    const { data: links } = await admin
      .from("parent_student_links")
      .select("student_profile_id")
      .eq("parent_profile_id", parent.id);
    for (const l of links ?? []) candidates.add(l.student_profile_id);
  }

  if (candidates.size === 0) return [];

  const { data: enrolled } = await admin
    .from("group_enrollments")
    .select("student_profile_id, student_profiles(id, full_name)")
    .eq("group_id", session.group_id)
    .in("student_profile_id", [...candidates]);

  const out: { id: string; full_name: string }[] = [];
  for (const e of enrolled ?? []) {
    const sp = e.student_profiles as { id: string; full_name: string } | null;
    if (sp) out.push({ id: sp.id, full_name: sp.full_name });
  }
  return out;
}

/** The `student_checkin` plugin must be on for the session's mosque. */
async function pluginActive(
  admin: ReturnType<typeof createSupabaseAdmin>,
  mosqueId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("mosque_plugins")
    .select("plugin_id")
    .eq("mosque_id", mosqueId)
    .eq("plugin_id", "student_checkin")
    .eq("is_active", true)
    .maybeSingle();
  return !!data;
}

async function load(
  admin: ReturnType<typeof createSupabaseAdmin>,
  userId: string,
  token: string,
) {
  const session = await resolveSession(admin, token);
  if (!session) return { error: "This check-in code is no longer valid." } as const;
  if (!(await pluginActive(admin, session.mosque_id))) {
    return { error: "This check-in code is no longer valid." } as const;
  }
  const students = await eligibleStudents(admin, userId, session);
  if (students.length === 0) {
    return { error: "You are not enrolled in this session's group." } as const;
  }
  return { session, students } as const;
}

/**
 * The mobile half of the web `/checkin/[token]` page: what a signed-in
 * student or parent sees when they open a check-in code. The code is the
 * capability — the token the teacher's QR encodes — and the plugin gate is
 * enforced here because students are not mosque members and a member-scoped
 * query would return nothing.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const { token } = await params;
  const admin = createSupabaseAdmin();
  const loaded = await load(admin, ctx.userId, token);
  if ("error" in loaded) return notFound(loaded.error);

  const { session, students } = loaded;

  const [{ data: records }, { data: group }] = await Promise.all([
    admin
      .from("attendance_records")
      .select("student_profile_id, status")
      .eq("session_id", session.id)
      .in("student_profile_id", students.map((s) => s.id)),
    admin.from("groups").select("name").eq("id", session.group_id).maybeSingle(),
  ]);

  const present = new Set(
    (records ?? [])
      .filter((r) => r.status === "present" || r.status === "late")
      .map((r) => r.student_profile_id),
  );

  return okNoStore({
    groupName: (group as { name: string } | null)?.name ?? "",
    sessionDate: session.session_date,
    students: students.map((s) => ({
      id: s.id,
      full_name: s.full_name,
      present: present.has(s.id),
    })),
  });
}

const checkinSchema = z.object({
  studentId: z.string().uuid("A student id is required"),
});

/**
 * Mark one eligible student present for a live session. Mirrors the web
 * `markPresent` server action: a status a teacher already set (excused/late)
 * is never overwritten, an upsert handles the conflict key, and the event is
 * audited.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const { token } = await params;
  const parsed = await parseJson(request, checkinSchema);
  if (!parsed.ok) return parsed.response;
  const { studentId } = parsed.data;

  const admin = createSupabaseAdmin();
  const loaded = await load(admin, ctx.userId, token);
  if ("error" in loaded) return notFound(loaded.error);

  const { session, students } = loaded;
  if (!students.some((s) => s.id === studentId)) {
    return err("You may not check in for this student.", 403, "not_allowed");
  }

  const { data: existing } = await admin
    .from("attendance_records")
    .select("id, status")
    .eq("session_id", session.id)
    .eq("student_profile_id", studentId)
    .maybeSingle();

  if (existing && existing.status !== "absent") {
    return ok({ alreadyPresent: true });
  }

  const { error } = await admin.from("attendance_records").upsert(
    {
      mosque_id: session.mosque_id,
      session_id: session.id,
      student_profile_id: studentId,
      status: "present",
      created_by: ctx.userId,
      updated_by: ctx.userId,
    },
    { onConflict: "session_id,student_profile_id" },
  );
  if (error) return dbErr(error.message);

  await writeAuditLog({
    mosqueId: session.mosque_id,
    actorUserId: ctx.userId,
    action: "attendance.recorded.checkin",
    targetTable: "attendance_records",
    targetId: null,
    metadata: { session_id: session.id, student_profile_id: studentId },
  });

  return ok({ alreadyPresent: false });
}
