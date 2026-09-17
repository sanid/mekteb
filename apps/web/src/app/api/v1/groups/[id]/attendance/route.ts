import { NextRequest } from "next/server";
import { z } from "zod";

import {
  extractUser,
  requireApiAdmin,
  requireApiTeacher,
  createSupabaseForUser,
  assertGroupInMosque,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized, forbidden } from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";
import { writeAuditLog } from "@/lib/audit";

const attendanceStatus = z.enum(["present", "absent", "late", "excused"]);
const postSchema = z.object({
  session_date: z.string().min(4),
  records: z
    .array(
      z.object({
        student_profile_id: z.guid(),
        status: attendanceStatus,
      }),
    )
    .min(1, "No attendance records provided"),
});

async function assertTeacherOfGroup(
  supabase: Awaited<ReturnType<typeof createSupabaseForUser>>,
  teacherProfileId: string,
  groupId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("teacher_group_links")
    .select("id")
    .eq("teacher_profile_id", teacherProfileId)
    .eq("group_id", groupId)
    .eq("is_active", true)
    .maybeSingle();
  return Boolean(data);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: groupId } = await params;
  const user = await extractUser(request);
  if (!user) return unauthorized();

  const supabase = createSupabaseForUser(request);

  const adminCtx = await requireApiAdmin(request);
  if (adminCtx) {
    if (!(await assertGroupInMosque(request, groupId, adminCtx.mosqueId))) {
      return forbidden("Not authorized for this group");
    }
  } else {
    const teacherCtx = await requireApiTeacher(request);
    if (!teacherCtx) return forbidden("Not authorized for this group");
    if (!(await assertGroupInMosque(request, groupId, teacherCtx.mosqueId))) {
      return forbidden("Not authorized for this group");
    }
    if (
      !(await assertTeacherOfGroup(
        supabase,
        teacherCtx.teacherProfileId,
        groupId,
      ))
    ) {
      return forbidden("Not authorized for this group");
    }
  }

  const { data: sessions, error } = await supabase
    .from("attendance_sessions")
    .select(
      "id, session_date, created_at, attendance_records(id, student_profile_id, status)",
    )
    .eq("group_id", groupId)
    .order("session_date", { ascending: false });

  if (error) return dbErr(error.message);
  return ok(sessions);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: groupId } = await params;
  const user = await extractUser(request);
  if (!user) return unauthorized();

  const supabase = createSupabaseForUser(request);

  let mosqueId: string;
  let userId: string;

  const adminCtx = await requireApiAdmin(request);
  if (adminCtx) {
    if (!(await assertGroupInMosque(request, groupId, adminCtx.mosqueId))) {
      return forbidden("Not authorized for this group");
    }
    mosqueId = adminCtx.mosqueId;
    userId = adminCtx.userId;
  } else {
    const teacherCtx = await requireApiTeacher(request);
    if (!teacherCtx) return forbidden("Not authorized");
    if (!(await assertGroupInMosque(request, groupId, teacherCtx.mosqueId))) {
      return forbidden("Not authorized for this group");
    }
    if (
      !(await assertTeacherOfGroup(
        supabase,
        teacherCtx.teacherProfileId,
        groupId,
      ))
    ) {
      return forbidden("Not authorized for this group");
    }
    mosqueId = teacherCtx.mosqueId;
    userId = teacherCtx.userId;
  }

  const parsed = await parseJson(request, postSchema);
  if (!parsed.ok) return parsed.response;
  const { session_date, records } = parsed.data;

  const { data: session, error: sessionError } = await supabase
    .from("attendance_sessions")
    .upsert(
      {
        mosque_id: mosqueId,
        group_id: groupId,
        session_date,
        created_by: userId,
        updated_by: userId,
      },
      { onConflict: "group_id,session_date" },
    )
    .select("id")
    .single();
  if (sessionError || !session)
    return dbErr(sessionError?.message);

  const upsertRecords = records.map((r) => ({
    mosque_id: mosqueId,
    session_id: session.id,
    student_profile_id: r.student_profile_id,
    status: r.status,
    created_by: userId,
    updated_by: userId,
  }));

  const { error: recordsError } = await supabase
    .from("attendance_records")
    .upsert(upsertRecords, { onConflict: "session_id,student_profile_id" });
  if (recordsError) return dbErr(recordsError.message);

  await writeAuditLog({
    mosqueId,
    actorUserId: userId,
    action: "attendance.saved",
    targetTable: "attendance_sessions",
    targetId: session.id,
    metadata: {
      group_id: groupId,
      session_date,
      record_count: String(records.length),
    },
  });

  return ok({ session_id: session.id });
}
