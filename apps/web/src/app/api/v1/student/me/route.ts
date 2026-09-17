import { NextRequest } from "next/server";

import {
  requireApiStudent,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, unauthorized } from "@/app/api/v1/helpers/response";

export async function GET(request: NextRequest) {
  const ctx = await requireApiStudent(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const { data: enrollments } = await supabase
    .from("group_enrollments")
    .select("id, group_id, groups(id, name)")
    .eq("student_profile_id", ctx.studentProfileId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_active", true);

  const typed = (enrollments ?? []) as unknown as Array<{
    id: string;
    group_id: string;
    groups: { id: string; name: string } | null;
  }>;

  return ok({
    studentProfileId: ctx.studentProfileId,
    fullName: ctx.fullName,
    groups: typed.map((e) => ({
      enrollmentId: e.id,
      groupId: e.group_id,
      groupName: e.groups?.name ?? "",
    })),
  });
}
