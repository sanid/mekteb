import { NextRequest } from "next/server";

import {
  requireApiTeacher,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { writeAuditLog } from "@/lib/audit";

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: homeworkId } = await params;
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const body = await request.json();
  const { group_id, title, body: hwBody, due_date, lesson_id } = body as {
    group_id?: string;
    title?: string;
    body?: string;
    due_date?: string;
    lesson_id?: string;
  };

  if (!group_id || !title?.trim()) return err("group_id and title are required");

  if (
    !(await assertTeacherOfGroup(supabase, ctx.teacherProfileId, group_id))
  ) {
    return err("Not authorized for this group", 403);
  }

  const { error } = await supabase
    .from("homework_assignments")
    .update({
      title: title.trim(),
      body: hwBody?.trim() || null,
      due_date: due_date?.trim() || null,
      lesson_id: lesson_id?.trim() || null,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", homeworkId)
    .eq("group_id", group_id)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return dbErr(error.message);

  return ok({ updated: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: homeworkId } = await params;
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const body = await request.json();
  const { group_id } = body as { group_id?: string };
  if (!group_id) return err("group_id is required");

  if (
    !(await assertTeacherOfGroup(supabase, ctx.teacherProfileId, group_id))
  ) {
    return err("Not authorized for this group", 403);
  }

  const { error } = await supabase
    .from("homework_assignments")
    .delete()
    .eq("id", homeworkId)
    .eq("group_id", group_id)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return dbErr(error.message);

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "homework.deleted",
    targetTable: "homework_assignments",
    targetId: homeworkId,
  });

  return ok({ deleted: true });
}
