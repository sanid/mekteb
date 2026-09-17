"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { requirePlatformOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbActionErr } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";

type Result = { error: string } | { ok: true };

export async function updateMosque(formData: FormData): Promise<Result> {
  await requirePlatformOwner();
  const id       = String(formData.get("mosque_id") ?? "").trim();
  const name     = String(formData.get("name") ?? "").trim();
  const slug     = String(formData.get("slug") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();

  if (!id || !name || !slug) return await actionError("name_and_slug_required");
  if (!/^[a-z0-9-]+$/.test(slug)) return await actionError("slug_invalid_chars");

  const admin = createAdminClient();

  // Check slug uniqueness (exclude self)
  const { data: conflict } = await admin
    .from("mosques")
    .select("id")
    .eq("slug", slug)
    .neq("id", id)
    .maybeSingle();
  if (conflict) return await actionError("slug_already_taken");

  const { error } = await admin
    .from("mosques")
    .update({ name, slug, timezone })
    .eq("id", id);
  if (error) return await dbActionErr(error.message, "updateMosque");

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setPlan(formData: FormData): Promise<Result> {
  await requirePlatformOwner();
  const mosqueId = String(formData.get("mosque_id") ?? "").trim();
  const planId   = String(formData.get("plan_id") ?? "").trim();
  if (!mosqueId || !planId) return await actionError("missing_fields");

  const admin = createAdminClient();
  const { error } = await admin
    .from("mosque_subscriptions")
    .upsert({ mosque_id: mosqueId, plan_id: planId }, { onConflict: "mosque_id" });
  if (error) return await dbActionErr(error.message, "setPlan");

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setSubscriptionStatus(mosqueId: string, status: "active" | "trialing" | "suspended" | "canceled"): Promise<Result> {
  await requirePlatformOwner();
  const admin = createAdminClient();
  const { error } = await admin
    .from("mosque_subscriptions")
    .upsert({ mosque_id: mosqueId, status, plan_id: "starter" }, { onConflict: "mosque_id" });
  if (error) return await dbActionErr(error.message, "setSubscriptionStatus");

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteMosque(formData: FormData) {
  await requirePlatformOwner();
  const id           = String(formData.get("mosque_id") ?? "").trim();
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  const mosqueName   = String(formData.get("mosque_name") ?? "").trim();

  if (confirmation !== mosqueName) return await actionError("name_mismatch");

  const admin = createAdminClient();

  // Delete all auth users who belong exclusively to this mosque
  const { data: memberships } = await admin
    .from("memberships")
    .select("user_id")
    .eq("mosque_id", id);

  const userIds = [...new Set((memberships ?? []).map((m) => m.user_id))];

  // Only delete users who have no memberships in other mosques
  for (const userId of userIds) {
    const { count } = await admin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("mosque_id", id);
    if (count === 0) {
      await admin.auth.admin.deleteUser(userId);
    }
  }

  // Cascade delete the mosque (FK cascades handle the rest)
  await admin.from("mosques").delete().eq("id", id);

  const locale = await getLocale();
  redirect(`/${locale}/platform-admin/mosques`);
}
