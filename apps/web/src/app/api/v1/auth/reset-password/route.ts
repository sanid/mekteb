import { NextRequest } from "next/server";
import { z } from "zod";

import { checkRateLimit } from "@/lib/rate-limit";
import {
  createSupabaseAdmin,
  resolveApiRole,
} from "@/app/api/v1/helpers/api-auth";
import {
  okNoStore,
  err,
  dbErr,
  tooMany,
} from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

/**
 * Native-client reset-password endpoint. The iOS app collects the
 * `token_hash` from the password-recovery email's deep link, then calls
 * this endpoint with the new password. We verify the OTP, update the
 * password, and return a fresh session — no browser involved.
 */
const schema = z.object({
  tokenHash: z.string().min(10),
  type: z.enum(["recovery", "email", "invite"]).default("recovery"),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const parsed = await parseJson(request, schema);
  if (!parsed.ok) return parsed.response;
  const { tokenHash, type, newPassword } = parsed.data;

  const limit = await checkRateLimit({
    bucket: "reset-password",
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
  });
  if (!limit.allowed) {
    return tooMany(
      "Too many attempts. Please try again later.",
      limit.retryAfterMs,
    );
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );

  const { data: verify, error: verifyErr } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });
  if (verifyErr || !verify.session || !verify.user) {
    return dbErr(
      verifyErr?.message,
      401,
      "invalid_token",
    );
  }

  const { error: updateErr } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateErr) {
    return dbErr(updateErr.message, 400, "password_update_failed");
  }

  const admin = createSupabaseAdmin();
  await admin
    .from("profiles")
    .update({
      must_rotate_password: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", verify.user.id);

  const { data: otp } = await admin
    .from("otp_issues")
    .select("id, mosque_id")
    .eq("user_id", verify.user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (otp) {
    await admin
      .from("otp_issues")
      .update({
        status: "activated",
        activated_at: new Date().toISOString(),
      })
      .eq("id", otp.id);
  }
  await admin.from("password_reset_audit").insert({
    mosque_id: otp?.mosque_id ?? null,
    user_id: verify.user.id,
    actor_user_id: verify.user.id,
    event: "password_rotated",
    metadata: { via: "reset_password" },
  });

  const authedRequest = new Request(request.url, {
    headers: { authorization: `Bearer ${verify.session.access_token}` },
  });
  const role = await resolveApiRole(verify.user.id, authedRequest);

  return okNoStore({
    accessToken: verify.session.access_token,
    refreshToken: verify.session.refresh_token,
    expiresIn: verify.session.expires_in,
    expiresAt: verify.session.expires_at,
    tokenType: verify.session.token_type,
    mustRotatePassword: false,
    role,
    userId: verify.user.id,
  });
}
