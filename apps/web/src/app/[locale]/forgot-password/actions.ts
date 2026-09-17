"use server";

import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/email";

export async function requestPasswordReset(formData: FormData) {
  const locale = await getLocale();
  const t = await getTranslations("Errors");

  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect(
      `/${locale}/forgot-password?error=${encodeURIComponent(t("email_required"))}`,
    );
  }

  // Keyed on the email (mirrors the API route): the 3/hour budget is per
  // account, while perIpLimit caps how many *different* accounts one IP can
  // hit. Without the key, a single IP could request resets for any number of
  // accounts — a low-grade mailbox flood.
  const { allowed } = await checkRateLimit({
    bucket: "forgot-password",
    key: email,
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    perIpLimit: 20,
  });

  if (!allowed) {
    redirect(
      `/${locale}/forgot-password?error=${encodeURIComponent(t("too_many_attempts"))}`,
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mekteb.de";
  const redirectTo = `${baseUrl}/auth/callback?next=/${locale}/change-password`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (!error && data?.properties?.action_link) {
      // Fire-and-forget — don't leak whether the email exists
      sendPasswordResetEmail({
        to: email,
        resetLink: data.properties.action_link,
        locale,
      }).catch(() => {});
    }
  } catch {
    // Silently swallow — always show success to avoid email enumeration
  }

  // Always redirect to success regardless of whether the email exists
  redirect(`/${locale}/forgot-password?sent=1`);
}
