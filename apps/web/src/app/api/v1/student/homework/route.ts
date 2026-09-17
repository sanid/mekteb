import { NextRequest } from "next/server";

import {
  requireApiStudent,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

export async function GET(request: NextRequest) {
  const ctx = await requireApiStudent(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const { data: enrollments } = await supabase
    .from("group_enrollments")
    .select("group_id")
    .eq("student_profile_id", ctx.studentProfileId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_active", true);

  const groupIds = (enrollments ?? []).map((e) => e.group_id);
  if (groupIds.length === 0) return ok([]);

  const { data: hw, error } = await supabase
    .from("homework_assignments")
    .select(
      "id, title, body, due_date, group_id, audience, created_at, groups(name), homework_targets(student_profile_id), homework_submissions(student_profile_id, acknowledged_at)",
    )
    .in("group_id", groupIds)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return dbErr(error.message);

  const typed = (hw ?? []) as unknown as Array<{
    id: string;
    title: string;
    body: string | null;
    due_date: string | null;
    group_id: string;
    audience: string;
    created_at: string;
    groups: { name: string } | null;
    homework_targets: Array<{ student_profile_id: string }>;
    homework_submissions: Array<{
      student_profile_id: string;
      acknowledged_at: string;
    }>;
  }>;

  const filtered = typed.filter(
    (h) =>
      h.audience === "group" ||
      h.homework_targets.some((t) => t.student_profile_id === ctx.studentProfileId),
  );

  return ok(
    filtered.map((h) => ({
      id: h.id,
      title: h.title,
      body: h.body,
      dueDate: h.due_date,
      groupId: h.group_id,
      groupName: h.groups?.name ?? "",
      acknowledgedAt:
        h.homework_submissions.find(
          (a) => a.student_profile_id === ctx.studentProfileId,
        )?.acknowledged_at ?? null,
    })),
  );
}
