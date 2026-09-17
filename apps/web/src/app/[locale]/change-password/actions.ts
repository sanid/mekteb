"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { primaryRole, requireUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { dbActionErr } from "@/lib/action-result";
import { actionErrorState } from "@/lib/action-errors";

export type ChangePasswordState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const { allowed } = await checkRateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  });
  if (!allowed) {
    return await actionErrorState("too_many_attempts");
  }

  const user = await requireUser();
  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (next.length < 8) {
    return await actionErrorState("password_min_8");
  }
  if (next !== confirm) {
    return await actionErrorState("passwords_do_not_match");
  }

  const supabase = await createClient();

  // Re-authenticate with the current password so a leaked active session
  // can't silently rotate the password to something the attacker controls.
  const { error: reauthErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (reauthErr) {
    return await actionErrorState("current_password_incorrect");
  }

  const { error: updateErr } = await supabase.auth.updateUser({ password: next });
  if (updateErr) {
    return { ok: false, ...await dbActionErr(updateErr.message, "changePassword") };
  }

  // Mark rotation complete and activate the pending OTP (if any). Use
  // service role so these writes never depend on the user's RLS grants.
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ must_rotate_password: false, updated_at: new Date().toISOString() })
    .eq("id", user.userId);

  const { data: otp } = await admin
    .from("otp_issues")
    .select("id, mosque_id")
    .eq("user_id", user.userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otp) {
    await admin
      .from("otp_issues")
      .update({ status: "activated", activated_at: new Date().toISOString() })
      .eq("id", otp.id);
  }

  await admin.from("password_reset_audit").insert({
    mosque_id: otp?.mosque_id ?? null,
    user_id: user.userId,
    actor_user_id: user.userId,
    event: "password_rotated",
    metadata: { first_login: true },
  });

  const locale = await getLocale();
  const role = await primaryRole(user.userId);
  const landingPath =
    role === "mosque_admin"
      ? "admin"
      : role === "teacher"
        ? "teacher"
        : role === "parent"
          ? "parent"
          : "no-access";
  redirect(`/${locale}/${landingPath}`);
}
