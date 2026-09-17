import { NextRequest } from "next/server";
import { z } from "zod";

import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdmin } from "@/app/api/v1/helpers/api-auth";
import { loadSession } from "@/app/api/v1/helpers/session";
import {
  okNoStore,
  err,
  dbErr,
  forbidden,
  tooMany,
} from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";
import { resolveLoginEmail } from "@/lib/student-auth";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

/**
 * `login` accepts either an email address (admin / teacher / parent) or a
 * mosque-qualified username (`al-nour.amina`) for students, who have no email.
 *
 * `email` is kept as a deprecated alias so existing clients keep working.
 * `mosqueSlug` lets a caller that already knows the mosque — the web app on a
 * subdomain — send a bare username, as it always has.
 */
const schema = z
  .object({
    login: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    password: z.string().min(1),
    mosqueSlug: z.string().max(64).optional(),
  })
  .refine((v) => v.login || v.email, {
    message: "login is required",
    path: ["login"],
  });

export async function POST(request: NextRequest) {
  const parsed = await parseJson(request, schema);
  if (!parsed.ok) return parsed.response;
  const { password, mosqueSlug } = parsed.data;

  const resolved = resolveLoginEmail(
    (parsed.data.login ?? parsed.data.email)!,
    mosqueSlug ?? null,
  );
  if (!resolved.ok) {
    return err(
      resolved.reason === "mosque_missing"
        ? "Include your mosque, e.g. al-nour.amina"
        : "That login is not valid.",
      400,
      resolved.reason === "mosque_missing" ? "login_needs_mosque" : "login_malformed",
    );
  }
  const email = resolved.email;

  // Keyed on the resolved address so a qualified username and a subdomain
  // login for the same student share one bucket. perIpLimit closes the
  // password-spraying hole: without it one IP could try 10 passwords against
  // an unbounded number of accounts.
  const limit = await checkRateLimit({
    bucket: "sign-in",
    key: email,
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    perIpLimit: 100,
  });
  if (!limit.allowed) {
    return tooMany("Too many attempts. Please try again later.", limit.retryAfterMs);
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user || !data.session) {
    const admin = createSupabaseAdmin();
    await admin.from("login_audit").insert({ email, success: false });
    return dbErr(error?.message, 401, "invalid_credentials");
  }

  const { data: memberships } = await supabase
    .from("memberships")
    .select("mosque_id")
    .eq("user_id", data.user.id)
    .eq("is_active", true)
    .limit(1);

  const admin = createSupabaseAdmin();
  await admin.from("login_audit").insert({
    user_id: data.user.id,
    email,
    success: true,
    mosque_id: memberships?.[0]?.mosque_id ?? null,
  });

  // Resolve the full session on this request so a mobile client can skip the
  // follow-up `/auth/me` round-trip — roles, plugins and profile all come back
  // with the tokens (they are the same queries `/auth/me` would run next).
  const authedRequest = new Request(request.url, {
    headers: { authorization: `Bearer ${data.session.access_token}` },
  });
  const session = await loadSession(authedRequest);
  if (!session) {
    return err("Could not resolve session", 500, "session_unavailable");
  }
  if (session.role === "none") {
    return forbidden(
      "Your account has no active membership. Contact your mosque admin.",
    );
  }

  // Check if user has verified TOTP factors (MFA required)
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verifiedTOTP = (factors?.totp ?? []).filter(
    (f) => f.status === "verified",
  );
  const mfaRequired = verifiedTOTP.length > 0;

  return okNoStore({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
    expiresAt: data.session.expires_at,
    tokenType: data.session.token_type,
    mfaRequired,
    ...session,
  });
}
