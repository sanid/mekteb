"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";

export async function createGroup(formData: FormData) {
  const ctx = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const category_id = String(formData.get("category_id") ?? "") || null;
  const room = String(formData.get("room") ?? "").trim() || null;
  if (!name) return;

  const supabase = await createClient();
  const { data } = await supabase.from("groups").insert({
    mosque_id: ctx.mosqueId,
    name,
    description,
    category_id,
    room,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  }).select("id").single();

  if (data) {
    await writeAuditLog({
      mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
      action: "group.created", targetTable: "groups", targetId: data.id,
      metadata: { name },
    });
  }
  revalidatePath("/", "layout");
}
