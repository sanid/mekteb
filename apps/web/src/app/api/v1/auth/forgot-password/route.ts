import { NextRequest } from "next/server";
import { z } from "zod";

import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  okNoStore,
  tooMany,
} from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";

const schema = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  redirectTo: z.string().url().optional(),
  client: z.enum(["web", "ios", "android"]).optional(),
  locale: z.enum(["de", "en", "bs", "tr"]).optional(),
});

function pickRedirect(redirectTo: string | undefined, client: string | undefined) {
  const baseWeb = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mekteb.de";
  const allow = (process.env.PASSWORD_RESET_ALLOWED_REDIRECTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (redirectTo) {
    if (allow.length === 0) {
      if (redirectTo.startsWith(baseWeb)) return redirectTo;
    } else if (allow.some((p) => redirectTo.startsWith(p))) {
      return redirectTo;
    }
  }

  if (client === "ios" || client === "android") {
    return (
      process.env.MOBILE_PASSWORD_RESET_REDIRECT ??
      `${baseWeb}/auth/callback?next=/change-password`
    );
  }
  return `${baseWeb}/auth/callback?next=/change-password`;
}

export async function POST(request: NextRequest) {
  const parsed = await parseJson(request, schema);
  if (!parsed.ok) return parsed.response;
  const { email, redirectTo, client, locale = "de" } = parsed.data;

  const limit = await checkRateLimit({
    bucket: "forgot-password",
    key: email,
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    perIpLimit: 20,
  });
  if (!limit.allowed) {
    return tooMany(
      "Too many attempts. Please try again later.",
      limit.retryAfterMs,
    );
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: pickRedirect(redirectTo, client) },
    });

    if (!error && data?.properties?.action_link) {
      sendPasswordResetEmail({
        to: email,
        resetLink: data.properties.action_link,
        locale,
      }).catch(() => {});
    }
  } catch {
    // Silently swallow — always return success to avoid email enumeration
  }

  return okNoStore({ sent: true });
}
