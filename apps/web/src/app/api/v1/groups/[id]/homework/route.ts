import { NextRequest } from "next/server";
import { z } from "zod";

import {
  extractUser,
  requireApiAdmin,
  requireApiTeacher,
  createSupabaseForUser,
  assertGroupInMosque,
} from "@/app/api/v1/helpers/api-auth";
import {
  ok,
  err,
  dbErr,
  unauthorized,
  forbidden,
} from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";
import { writeAuditLog } from "@/lib/audit";

async function assertTeacherOfGroup(
  supabase: ReturnType<typeof createSupabaseForUser>,
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

const postSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  body: z.string().trim().optional().nullable(),
  lesson_id: z.guid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  audience: z.enum(["group", "individual"]).default("group"),
  student_ids: z.array(z.guid()).default([]),
});

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
  }

  const { data: homework, error } = await supabase
    .from("homework_assignments")
    .select(
      "id, title, body, due_date, audience, lesson_id, created_at, updated_at, homework_targets(student_profile_id)",
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) return dbErr(error.message);
  return ok(homework);
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
  const { title, body: hwBody, lesson_id, due_date, audience, student_ids } =
    parsed.data;

  if (audience === "individual" && student_ids.length === 0) {
    return err("Select at least one student");
  }

  const { data: hw, error } = await supabase
    .from("homework_assignments")
    .insert({
      mosque_id: mosqueId,
      group_id: groupId,
      lesson_id: lesson_id?.trim() || null,
      title: title.trim(),
      body: hwBody?.trim() || null,
      due_date: due_date?.trim() || null,
      audience,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();
  if (error || !hw)
    return dbErr(error?.message);

  if (audience === "individual" && student_ids.length > 0) {
    const { error: targetsError } = await supabase
      .from("homework_targets")
      .insert(
        student_ids.map((student_profile_id) => ({
          mosque_id: mosqueId,
          homework_id: hw.id,
          student_profile_id,
          created_by: userId,
          updated_by: userId,
        })),
      );
    if (targetsError) return dbErr(targetsError.message);
  }

  await writeAuditLog({
    mosqueId,
    actorUserId: userId,
    action: "homework.created",
    targetTable: "homework_assignments",
    targetId: hw.id,
    metadata: { group_id: groupId, title: title.trim() },
  });

  return ok({ id: hw.id }, 201);
}
