import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { z } from "zod";

import { checkRateLimit } from "@/lib/rate-limit";
import {
  extractUser,
  createSupabaseAdmin,
  resolveApiRole,
} from "@/app/api/v1/helpers/api-auth";
import {
  okNoStore,
  err,
  dbErr,
  unauthorized,
  tooMany,
} from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";
import type { Database } from "@/lib/supabase/types";

const schema = z
  .object({
    current_password: z.string().min(1),
    new_password: z.string().min(8, "New password must be at least 8 characters."),
    confirm_password: z.string().min(1),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match.",
  });

export async function POST(request: NextRequest) {
  const user = await extractUser(request);
  if (!user) return unauthorized("Not authenticated");

  const limit = await checkRateLimit({
    bucket: "change-password",
    key: user.userId,
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  });
  if (!limit.allowed) {
    return tooMany(
      "Too many attempts. Please try again later.",
      limit.retryAfterMs,
    );
  }

  const parsed = await parseJson(request, schema);
  if (!parsed.ok) return parsed.response;
  const { current_password, new_password } = parsed.data;

  const reauth = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
  const { error: reauthErr } = await reauth.auth.signInWithPassword({
    email: user.email,
    password: current_password,
  });
  if (reauthErr) {
    return err("Current password is incorrect.", 401, "invalid_credentials");
  }

  const admin = createSupabaseAdmin();

  /**
   * The password update goes through the admin client, not the caller's own.
   *
   * `createSupabaseForUser` builds a client that carries the bearer token as a
   * header and has no cookie storage at all, and `auth.updateUser()` requires
   * a *session* rather than a header — on this route it always failed with
   * "Auth session missing!", so no API client could ever rotate a password.
   * That blocked every first login: `requireApiStudent`/`requireApiMember`
   * reject any request while `must_rotate_password` is set, so a new account
   * could not call a single endpoint until it rotated, and it could not
   * rotate.
   *
   * This is no weaker: the caller has already re-authenticated with their
   * current password just above, and `user.userId` comes from the verified
   * token, not from the request body.
   */
  const { error: updateErr } = await admin.auth.admin.updateUserById(
    user.userId,
    { password: new_password },
  );
  if (updateErr) {
    return dbErr(updateErr.message, 400, "password_update_failed");
  }

  await admin
    .from("profiles")
    .update({
      must_rotate_password: false,
      updated_at: new Date().toISOString(),
    })
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
      .update({
        status: "activated",
        activated_at: new Date().toISOString(),
      })
      .eq("id", otp.id);
  }

  await admin.from("password_reset_audit").insert({
    mosque_id: otp?.mosque_id ?? null,
    user_id: user.userId,
    actor_user_id: user.userId,
    event: "password_rotated",
    metadata: { first_login: true },
  });

  const role = await resolveApiRole(user.userId, request);
  return okNoStore({ mustRotatePassword: false, role });
}
