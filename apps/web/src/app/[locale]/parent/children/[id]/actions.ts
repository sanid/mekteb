"use server";

import { requireParent } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/components/ActionForm";
import { dbActionErr } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";

export async function acknowledgeHomework(
  studentId: string,
  homeworkId: string,
): Promise<ActionResult> {
  const ctx = await requireParent();
  const supabase = await createClient();

  // Verify parent has access to this student
  const { data: link } = await supabase
    .from("parent_student_links")
    .select("id")
    .eq("parent_profile_id", ctx.parentProfileId)
    .eq("student_profile_id", studentId)
    .maybeSingle();

  if (!link) return await actionError("not_authorised");

  const { error } = await supabase.from("homework_submissions").upsert(
    {
      mosque_id: ctx.mosqueId,
      homework_id: homeworkId,
      student_profile_id: studentId,
      acknowledged_by: ctx.userId,
      acknowledged_at: new Date().toISOString(),
      created_by: ctx.userId,
      updated_by: ctx.userId,
    },
    { onConflict: "homework_id,student_profile_id" },
  );

  if (error) return await dbActionErr(error.message, "acknowledgeHomework");

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "homework.acknowledged",
    targetTable: "homework_submissions",
    targetId: null,
    metadata: { homework_id: homeworkId, student_profile_id: studentId },
  });
  return { ok: true };
}
