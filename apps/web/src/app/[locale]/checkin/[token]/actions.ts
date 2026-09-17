"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { dbActionErr } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";

const MAX_OPEN_MS = 12 * 60 * 60 * 1000; // tokens auto-expire after 12h

type SessionRow = {
  id: string;
  mosque_id: string;
  group_id: string;
  session_date: string;
  checkin_active: boolean;
  checkin_opened_at: string | null;
};

export async function resolveCheckinSession(
  admin: ReturnType<typeof createAdminClient>,
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
 * Students the signed-in user may check in for this session: their own student
 * profile (if a student) or their linked children (if a parent), limited to
 * those enrolled in the session's group.
 */
export async function eligibleStudents(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  session: SessionRow,
): Promise<{ id: string; full_name: string }[]> {
  // Candidate student profile ids for this user.
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

  // Keep only those enrolled in the session's group.
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

export async function markPresent(
  token: string,
  studentId: string,
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return await actionError("not_signed_in");

  const admin = createAdminClient();
  const session = await resolveCheckinSession(admin, token);
  if (!session) return await actionError("checkin_closed");

  const eligible = await eligibleStudents(admin, user.id, session);
  if (!eligible.some((s) => s.id === studentId)) {
    return await actionError("not_allowed");
  }

  // Don't overwrite a status a teacher already set (e.g. excused/late).
  const { data: existing } = await admin
    .from("attendance_records")
    .select("id, status")
    .eq("session_id", session.id)
    .eq("student_profile_id", studentId)
    .maybeSingle();

  if (existing && existing.status !== "absent") {
    return { ok: true };
  }

  const { error } = await admin.from("attendance_records").upsert(
    {
      mosque_id: session.mosque_id,
      session_id: session.id,
      student_profile_id: studentId,
      status: "present",
      created_by: user.id,
      updated_by: user.id,
    },
    { onConflict: "session_id,student_profile_id" },
  );
  if (error) return await dbActionErr(error.message, "markPresent");

  await writeAuditLog({
    mosqueId: session.mosque_id,
    actorUserId: user.id,
    action: "attendance.recorded.checkin",
    targetTable: "attendance_records",
    targetId: null,
    metadata: { session_id: session.id, student_profile_id: studentId },
  });

  revalidatePath(`/[locale]/checkin/${token}`, "page");
  return { ok: true };
}
