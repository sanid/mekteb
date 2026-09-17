"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { cookies } from "next/headers";

import { resolvePrimaryRole } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeDbCode } from "@/lib/db-error";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setActiveMosqueCookie } from "@/lib/mosque-session";
import { resolveLoginEmail } from "@/lib/student-auth";

async function writeLoginAudit(opts: {
  userId?: string;
  email: string;
  success: boolean;
  mosqueId?: string | null;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("login_audit").insert({
      user_id: opts.userId ?? null,
      email: opts.email,
      success: opts.success,
      mosque_id: opts.mosqueId ?? null,
    });
  } catch {
    // Audit failure must never block the auth flow.
  }
}

export async function signIn(formData: FormData) {
  const rawLogin = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const mosqueSlug = String(formData.get("mosque_slug") ?? "").trim() || null;

  // Students sign in with a mosque-qualified username (`al-nour.amina`); a
  // bare username still works on the mosque's own subdomain.
  const resolved = resolveLoginEmail(rawLogin, mosqueSlug);
  if (!resolved.ok) {
    const locale = await getLocale();
    const t = await getTranslations("Errors");
    return redirect(
      `/${locale}/login?error=${encodeURIComponent(
        t(resolved.reason === "mosque_missing" ? "login_needs_mosque" : "login_malformed"),
      )}`,
    );
  }
  const email = resolved.email;

  // Keyed on the resolved email so the budget is per account, not per IP —
  // one IP must not be able to try ten different accounts (mirrors the API
  // route `/api/v1/auth/sign-in`). The identifier is email+IP, so a shared
  // NAT can't lock out an entire building. The per-IP cap closes the
  // password-spraying hole: without it one IP could try 10 passwords against
  // an unbounded number of accounts.
  const { allowed } = await checkRateLimit({
    bucket: "sign-in",
    key: email,
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    perIpLimit: 100,
  });
  if (!allowed) {
    const locale = await getLocale();
    const t = await getTranslations("Errors");
    return redirect(
      `/${locale}/login?error=${encodeURIComponent(t("login_too_many_attempts"))}`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  const locale = await getLocale();
  if (error || !data.user) {
    after(() => writeLoginAudit({ email, success: false }));
    const t = await getTranslations("Errors");
    return redirect(
      `/${locale}/login?email=${encodeURIComponent(rawLogin)}&error=${encodeURIComponent(
        t(`db_${sanitizeDbCode(error?.message, "signIn")}`),
      )}`,
    );
  }

  const [
    membershipsResult,
    profileResult,
    mfaResult,
    studentProfileResult,
  ] = await Promise.all([
    supabase
      .from("memberships")
      .select("mosque_id, role")
      .eq("user_id", data.user.id)
      .eq("is_active", true),
    supabase
      .from("profiles")
      .select("must_rotate_password")
      .eq("id", data.user.id)
      .maybeSingle(),
    supabase.auth.mfa.listFactors(),
    supabase
      .from("student_profiles")
      .select("id")
      .eq("profile_id", data.user.id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const memberships = membershipsResult.data ?? [];
  const mosqueId = memberships[0]?.mosque_id ?? null;

  // Runs after the response is sent — the audit row must not delay the redirect.
  after(() =>
    writeLoginAudit({
      userId: data.user.id,
      email,
      success: true,
      mosqueId,
    }),
  );

  let cookieWrite: Promise<void> = Promise.resolve();
  if (mosqueSlug) {
    const admin = createAdminClient();
    cookieWrite = (async () => {
      const { data: slugMosque } = await admin
        .from("mosques")
        .select("id")
        .eq("slug", mosqueSlug)
        .maybeSingle();
      if (slugMosque) {
        const hasAccess = memberships.some((m) => m.mosque_id === slugMosque.id);
        if (hasAccess) {
          await setActiveMosqueCookie(slugMosque.id);
        }
      }
    })();
  } else if (mosqueId) {
    cookieWrite = setActiveMosqueCookie(mosqueId);
  }

  await cookieWrite;

  if (profileResult.data?.must_rotate_password) {
    redirect(`/${locale}/change-password`);
  }

  const verifiedFactors = (mfaResult.data?.totp ?? []).filter(
    (f) => f.status === "verified",
  );
  if (verifiedFactors.length > 0) {
    redirect(`/${locale}/verify-2fa`);
  }

  const role = resolvePrimaryRole(memberships, !!studentProfileResult.data);
  const landingPath =
    role === "platform_owner"
      ? "platform-admin"
      : role === "mosque_admin"
        ? "admin"
        : role === "examiner"
          ? "examiner"
          : role === "teacher"
            ? "teacher"
            : role === "parent"
              ? "parent"
              : role === "student"
                ? "student"
                : "no-access";
  redirect(`/${locale}/${landingPath}`);
}

export async function signOut() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: memberships } = await supabase
      .from("memberships")
      .select("mosque_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);
    const mosqueId = memberships?.[0]?.mosque_id ?? null;
    after(() => writeLoginAudit({ userId: user.id, email: user.email ?? "", success: true, mosqueId }));
  }
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete("mosque_primary_color");
  const locale = await getLocale();
  redirect(`/${locale}/login`);
}
