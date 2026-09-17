"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setActiveMosqueCookie } from "@/lib/mosque-session";
import { dbActionErr } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";
import { generateTempPassword, otpExpiresAt } from "@/lib/onboarding";
import { findAuthUserByEmail } from "@/lib/auth-users";

export type ActionResult = { error: string; code?: string } | { ok: true } | null | undefined;

/** What the appoint form shows once, after creating a brand-new admin. */
export type CreateAdminResult =
  | { ok: true; email: string; full_name: string; tempPassword: string; expires_at: string }
  | { error: string };

/**
 * Switch the active mosque cookie and redirect to admin home.
 */
export async function switchMosque(mosqueId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  // Validate this user actually has mosque_admin membership for that mosque
  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("mosque_id", mosqueId)
    .eq("role", "mosque_admin")
    .eq("is_active", true)
    .maybeSingle();

  if (!membership) {
    const locale = await getLocale();
    redirect(`/${locale}/no-access`);
  }

  await setActiveMosqueCookie(mosqueId);
  const locale = await getLocale();
  redirect(`/${locale}/admin`);
}

/**
 * Create a new mosque. Requires the caller's active mosque to be on the community plan.
 */
export async function createMosque(formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const locale = await getLocale();

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const timezone =
    String(formData.get("timezone") ?? "").trim() || "Europe/Berlin";
  const state = String(formData.get("state") ?? "").trim() || "Berlin";

  if (!name) return await actionError("mosque_name_required");
  if (!slug) return await actionError("slug_required");
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return {
      error:
        "Slug may only contain lowercase letters, numbers, and hyphens.",
    };
  }

  // Check caller's plan allows additional mosques
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("mosque_subscriptions")
    .select("plans(max_mosques)")
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  const maxMosques = (sub?.plans as { max_mosques: number | null } | null | undefined)?.max_mosques ?? 1;

  if (maxMosques !== null) {
    // Count mosques this user admins
    const { count } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.userId)
      .eq("role", "mosque_admin")
      .eq("is_active", true);

    if ((count ?? 0) >= maxMosques) {
      return await actionError("plan_disallows_more_mosques");
    }
  }

  const admin = createAdminClient();

  // Check slug uniqueness
  const { data: existing } = await admin
    .from("mosques")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    return await actionError("slug_already_taken");
  }

  // Insert mosque
  const { data: mosque, error: mosqueError } = await admin
    .from("mosques")
    .insert({
      name,
      slug,
      timezone,
      state,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id")
    .single();

  if (mosqueError || !mosque) {
    return { error: mosqueError?.message ?? "Failed to create mosque." };
  }

  // Insert admin membership
  const { error: memberError } = await admin.from("memberships").insert({
    mosque_id: mosque.id,
    user_id: ctx.userId,
    role: "mosque_admin",
    is_active: true,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });

  if (memberError) {
    await admin.from("mosques").delete().eq("id", mosque.id);
    return await dbActionErr(memberError.message, "createMosque");
  }

  // Upsert subscription on community plan
  await admin.from("mosque_subscriptions").upsert(
    {
      mosque_id: mosque.id,
      plan_id: "community",
      status: "active",
    },
    { onConflict: "mosque_id" },
  );

  // Switch the cookie to the new mosque
  await setActiveMosqueCookie(mosque.id);

  redirect(`/${locale}/admin`);
}

/**
 * Appoint another user as mosque_admin for the caller's active mosque.
 */
export async function appointAdmin(formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();

  const mosqueId = String(formData.get("mosque_id") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (mosqueId !== ctx.mosqueId) {
    return await actionError("wrong_mosque_for_admin_add");
  }
  if (!email) return await actionError("email_required");

  const admin = createAdminClient();

  const lookup = await findAuthUserByEmail(admin, email);
  // A failed lookup is not the same as a missing account: reporting "no
  // account" here would send the admin down the create-one path and try to
  // register an address that already exists.
  if (lookup.error) return await dbActionErr(lookup.error, "appointAdmin");
  if (!lookup.user) return await actionError("no_account_for_email");
  const targetUserId = lookup.user.id;

  // Check that they have a profiles row
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", targetUserId)
    .maybeSingle();
  if (!profile) {
    return await actionError("no_account_for_email");
  }

  // Check if already an active admin
  const { data: existing } = await admin
    .from("memberships")
    .select("id, is_active")
    .eq("mosque_id", mosqueId)
    .eq("user_id", targetUserId)
    .eq("role", "mosque_admin")
    .maybeSingle();

  if (existing?.is_active) {
    return await actionError("already_admin_for_mosque");
  }

  if (existing) {
    // Reactivate
    await admin
      .from("memberships")
      .update({ is_active: true, updated_by: ctx.userId })
      .eq("id", existing.id);
  } else {
    const { error: insertError } = await admin.from("memberships").insert({
      mosque_id: mosqueId,
      user_id: targetUserId,
      role: "mosque_admin",
      is_active: true,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
    if (insertError) return await dbActionErr(insertError.message, "appointAdmin");
  }

  // Notify the newly appointed admin by email (fire-and-forget)
  const locale = await getLocale();
  const { sendAdminAppointedEmail } = await import("@/lib/email");
  sendAdminAppointedEmail({ to: email, mosqueName: ctx.mosqueName, locale }).catch(() => {});

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Create a brand-new account **and** appoint it as mosque_admin.
 *
 * `appointAdmin` can only promote someone who already has a Mekteb account,
 * which left no way to bring in an admin who has never used the product: the
 * only workaround was to create them as a teacher first, purely to have a
 * row to promote. This is the fallback the form offers when that lookup
 * misses.
 *
 * Follows the same handover model as `createPersonAccount`: the temporary
 * password is generated here, returned exactly once for the admin to pass on
 * in person, and never persisted in plaintext. The account is flagged
 * `must_rotate_password`, so the recipient sets their own on first login.
 */
export async function createAndAppointAdmin(
  _prev: unknown,
  formData: FormData,
): Promise<CreateAdminResult> {
  const ctx = await requireAdmin();

  const mosqueId = String(formData.get("mosque_id") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const full_name = String(formData.get("full_name") ?? "").trim();

  if (mosqueId !== ctx.mosqueId) return await actionError("wrong_mosque_for_admin_add");
  if (!email) return await actionError("email_required");
  if (!full_name) return await actionError("full_name_required");

  const admin = createAdminClient();

  // Re-check rather than trusting the client's earlier miss: the form's
  // lookup and this call are separate requests, and appointing must stay the
  // path for anyone who already exists.
  const existing = await findAuthUserByEmail(admin, email);
  if (existing.error) return await dbActionErr(existing.error, "createAndAppointAdmin");
  if (existing.user) return await actionError("account_already_exists_appoint_instead");

  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name, display_name: full_name },
  });
  if (createErr || !created.user) {
    return { error: createErr?.message ?? "Failed to create the account." };
  }
  const newUserId = created.user.id;

  await admin
    .from("profiles")
    .update({ must_rotate_password: true, updated_at: new Date().toISOString() })
    .eq("id", newUserId);

  const { error: membershipErr } = await admin.from("memberships").insert({
    user_id: newUserId,
    mosque_id: mosqueId,
    role: "mosque_admin",
    is_active: true,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (membershipErr) {
    // Roll back so a failed appointment leaves no orphan login behind.
    await admin.auth.admin.deleteUser(newUserId);
    return await dbActionErr(membershipErr.message, "createAndAppointAdmin");
  }

  // Mosque admins hold no domain profile row — membership is the whole grant.
  const expires_at = otpExpiresAt();
  await admin.from("otp_issues").insert({
    mosque_id: mosqueId,
    user_id: newUserId,
    issued_by: ctx.userId,
    expires_at,
    metadata: { role: "mosque_admin", email },
  });
  await admin.from("password_reset_audit").insert({
    mosque_id: mosqueId,
    user_id: newUserId,
    actor_user_id: ctx.userId,
    event: "otp_issued",
    metadata: { role: "mosque_admin", email, expires_at },
  });
  await admin.from("audit_logs").insert({
    mosque_id: mosqueId,
    actor_user_id: ctx.userId,
    action: "mosque_admin.account_created",
    target_table: "memberships",
    target_id: newUserId,
    metadata: { email },
  });

  const locale = await getLocale();
  const { sendAdminAppointedEmail } = await import("@/lib/email");
  sendAdminAppointedEmail({ to: email, mosqueName: ctx.mosqueName, locale }).catch(() => {});

  revalidatePath("/", "layout");
  return { ok: true, email, full_name, tempPassword, expires_at };
}

/**
 * Remove (deactivate) a mosque_admin membership.
 */
export async function removeAdmin(formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();

  const mosqueId = String(formData.get("mosque_id") ?? "").trim();
  const targetUserId = String(formData.get("user_id") ?? "").trim();

  if (mosqueId !== ctx.mosqueId) {
    return await actionError("wrong_mosque_for_admin_remove");
  }
  if (targetUserId === ctx.userId) {
    return await actionError("cannot_remove_self_admin");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("memberships")
    .update({ is_active: false, updated_by: ctx.userId })
    .eq("mosque_id", mosqueId)
    .eq("user_id", targetUserId)
    .eq("role", "mosque_admin");

  if (error) return await dbActionErr(error.message, "removeAdmin");

  revalidatePath("/", "layout");
  return { ok: true };
}
