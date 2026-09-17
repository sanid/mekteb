"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { dbActionErr, type ActionResult } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";


export async function updateParentProfile(
  parentId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const display_name = String(formData.get("display_name") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const relation = String(formData.get("relation") ?? "").trim() || null;

  if (!full_name) return await actionError("full_name_required");

  const supabase = await createClient();

  const { data: parent } = await supabase
    .from("parent_profiles")
    .select("id, profile_id")
    .eq("id", parentId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!parent) return await actionError("parent_not_found");

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      full_name,
      display_name,
      phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parent.profile_id);

  if (profileErr) return await dbActionErr(profileErr.message, "updateParentProfile");

  const { error: parentErr } = await supabase
    .from("parent_profiles")
    .update({
      relation,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parentId);

  if (parentErr) return await dbActionErr(parentErr.message, "updateParentProfile");

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteParent(
  parentId: string,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data: parent } = await supabase
    .from("parent_profiles")
    .select("id, profile_id")
    .eq("id", parentId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!parent) return await actionError("parent_not_found");

  const admin = createAdminClient();

  // Write erasure audit log before deleting (records won't exist after cascade).
  await admin.from("audit_logs").insert({
    mosque_id: ctx.mosqueId,
    actor_user_id: ctx.userId,
    action: "parent.account_erased",
    target_table: "parent_profiles",
    target_id: parentId,
    metadata: { profile_id: parent.profile_id },
  });

  // Deleting the auth user cascades: profiles → parent_profiles + all linked data.
  await admin.auth.admin.deleteUser(parent.profile_id);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function linkStudentToParent(
  parentId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const studentProfileId = String(formData.get("student_profile_id") ?? "").trim();
  if (!studentProfileId) return await actionError("select_a_student");

  const supabase = await createClient();

  const { data: parent } = await supabase
    .from("parent_profiles")
    .select("id")
    .eq("id", parentId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!parent) return await actionError("parent_not_found");

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("id", studentProfileId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!student) return await actionError("student_not_found");

  const { error } = await supabase.from("parent_student_links").insert({
    mosque_id: ctx.mosqueId,
    parent_profile_id: parentId,
    student_profile_id: studentProfileId,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });

  if (error) {
    if (error.code === "23505") return await actionError("already_linked");
    return await dbActionErr(error.message, "linkStudentToParent");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function unlinkStudentFromParent(formData: FormData): Promise<{ ok: true } | null> {
  const ctx = await requireAdmin();
  const linkId = String(formData.get("link_id") ?? "").trim();
  if (!linkId) return null;

  const supabase = await createClient();
  await supabase
    .from("parent_student_links")
    .delete()
    .eq("id", linkId)
    .eq("mosque_id", ctx.mosqueId);

  revalidatePath("/", "layout");
  return { ok: true };
}
