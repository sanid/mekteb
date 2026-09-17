"use server";

import { revalidatePath } from "next/cache";

import { requireStudent } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { dbActionErr, type ActionResult } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";

export async function acknowledgeHomework(homeworkId: string): Promise<ActionResult> {
  const ctx = await requireStudent();
  const supabase = await createClient();

  // Verify student has access to this homework (RLS enforces it too)
  const { data: hw } = await supabase
    .from("homework_assignments")
    .select("id, mosque_id")
    .eq("id", homeworkId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_published", true)
    .maybeSingle();

  if (!hw) return await actionError("homework_not_found");

  // Upsert — idempotent if already acknowledged
  const { error } = await supabase
    .from("homework_submissions")
    .upsert(
      {
        mosque_id: ctx.mosqueId,
        homework_id: homeworkId,
        student_profile_id: ctx.studentProfileId,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: ctx.userId,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
      { onConflict: "homework_id,student_profile_id", ignoreDuplicates: true },
    );

  if (error) return await dbActionErr(error.message, "acknowledgeHomework");
  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "homework.acknowledged",
    targetTable: "homework_submissions",
    targetId: null,
    metadata: { homework_id: homeworkId },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
