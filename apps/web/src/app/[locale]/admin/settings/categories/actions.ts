"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { dbActionErr } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";

export async function createCategory(formData: FormData) {
  const ctx = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || "#10b981";
  const is_hifz = formData.get("is_hifz") === "true";

  if (!name) return await actionError("name_required");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_categories")
    .insert({
      mosque_id: ctx.mosqueId,
      name,
      color,
      is_hifz,
    })
    .select("id")
    .single();

  if (error) {
    return await dbActionErr(error.message, "createCategory");
  }

  if (data) {
    await writeAuditLog({
      mosqueId: ctx.mosqueId,
      actorUserId: ctx.userId,
      action: "category.created",
      targetTable: "group_categories",
      targetId: data.id,
      metadata: { name, color },
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateCategory(categoryId: string, formData: FormData) {
  const ctx = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || "#10b981";
  const is_hifz = formData.get("is_hifz") === "true";

  if (!name) return await actionError("name_required");

  const supabase = await createClient();
  const { error } = await supabase
    .from("group_categories")
    .update({
      name,
      color,
      is_hifz,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId)
    .eq("mosque_id", ctx.mosqueId);

  if (error) {
    return await dbActionErr(error.message, "updateCategory");
  }

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "category.updated",
    targetTable: "group_categories",
    targetId: categoryId,
    metadata: { name, color },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCategory(categoryId: string) {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_categories")
    .delete()
    .eq("id", categoryId)
    .eq("mosque_id", ctx.mosqueId);

  if (error) {
    return await dbActionErr(error.message, "deleteCategory");
  }

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "category.deleted",
    targetTable: "group_categories",
    targetId: categoryId,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
