"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendOnboardingEmail } from "@/lib/email";
import { dbActionErr } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";

type OnboardingResult =
  | { ok: true; mosqueSlug: string }
  | { error: string };

// Beta: nothing is billed, so no plan sends the new admin to checkout.
const PAID_PLANS: string[] = [];

export async function createMosqueAndAdmin(_prev: unknown, formData: FormData): Promise<OnboardingResult> {
  const mosqueName = String(formData.get("mosque_name") ?? "").trim();
  const mosqueSlug = String(formData.get("mosque_slug") ?? "").trim();
  const timezone   = String(formData.get("timezone") ?? "Europe/Berlin").trim();
  const email      = String(formData.get("email") ?? "").trim();
  const password   = String(formData.get("password") ?? "").trim();
  // Beta: every new mosque starts on the free plan, whatever the form posts.
  const plan       = "starter";

  // Public, unauthenticated account creation — throttle hard per IP so the
  // endpoint can't be scripted to exhaust slugs or flood the auth table.
  const limit = await checkRateLimit({
    bucket: "mosque-onboarding",
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    perIpLimit: 5,
    key: email.toLowerCase() || mosqueSlug,
  });
  if (!limit.allowed) return await actionError("onboarding_throttled");

  if (!mosqueName || !mosqueSlug || !email || !password) {
    return await actionError("fields_required");
  }
  if (password.length < 8) {
    return await actionError("password_min_8");
  }
  if (!/^[a-z0-9-]+$/.test(mosqueSlug)) {
    return await actionError("slug_invalid_chars");
  }

  const admin = createAdminClient();

  // Check slug uniqueness
  const { data: existing } = await admin
    .from("mosques")
    .select("id")
    .eq("slug", mosqueSlug)
    .maybeSingle();
  if (existing) return await actionError("url_already_taken");

  // Create the auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    return { error: authError?.message ?? "Failed to create account." };
  }
  const userId = authData.user.id;

  // Create the profile row — required for account settings and must_rotate_password checks
  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: userId, must_rotate_password: false });
  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return await dbActionErr(profileError.message, "createMosqueAndAdmin");
  }

  // Create the mosque
  const { data: mosque, error: mosqueError } = await admin
    .from("mosques")
    .insert({ name: mosqueName, slug: mosqueSlug, timezone })
    .select("id")
    .single();
  if (mosqueError || !mosque) {
    await admin.auth.admin.deleteUser(userId); // cascades profile via FK
    return { error: mosqueError?.message ?? "Failed to create mosque." };
  }

  // Create mosque_admin membership
  const { error: memberError } = await admin.from("memberships").insert({
    user_id: userId,
    mosque_id: mosque.id,
    role: "mosque_admin",
    is_active: true,
  });
  if (memberError) {
    await admin.auth.admin.deleteUser(userId); // cascades profile via FK
    await admin.from("mosques").delete().eq("id", mosque.id);
    return await dbActionErr(memberError.message, "createMosqueAndAdmin");
  }

  // Sign the user in so they land on the right page without a separate login step
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });

  const { redirect } = await import("next/navigation");
  const { getLocale } = await import("next-intl/server");
  const locale = await getLocale();

  // Send welcome email in the user's language (fire-and-forget — don't block redirect)
  sendOnboardingEmail({ to: email, mosqueName, mosqueSlug, locale }).catch(() => {});

  if (PAID_PLANS.includes(plan)) {
    redirect(`/${locale}/admin/settings/billing/checkout?plan=${plan}`);
  } else {
    redirect(`/${locale}/admin`);
  }

  return { ok: true, mosqueSlug }; // unreachable
}
