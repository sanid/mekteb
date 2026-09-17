import { NextRequest } from "next/server";

import {
  extractUser,
  createSupabaseAdmin,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { okNoStore, unauthorized } from "@/app/api/v1/helpers/response";

export async function POST(request: NextRequest) {
  const user = await extractUser(request);
  if (!user) return unauthorized("Not authenticated");

  const supabase = createSupabaseForUser(request);
  const { data: memberships } = await supabase
    .from("memberships")
    .select("mosque_id")
    .eq("user_id", user.userId)
    .eq("is_active", true)
    .limit(1);

  const admin = createSupabaseAdmin();
  await admin.from("login_audit").insert({
    user_id: user.userId,
    email: user.email,
    success: true,
    mosque_id: memberships?.[0]?.mosque_id ?? null,
  });

  // Actually revoke: pass the access token JWT to admin.signOut so the
  // associated refresh token is invalidated. Defaults to "global" scope,
  // which revokes ALL refresh tokens for this user.
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (token) {
    try {
      await admin.auth.admin.signOut(token, "global");
    } catch {
      // best-effort; never leak details to caller
    }
  }

  return okNoStore({ signedOut: true });
}
