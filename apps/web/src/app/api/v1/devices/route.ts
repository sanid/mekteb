import { NextRequest } from "next/server";
import { z } from "zod";

import {
  extractUser,
  requireApiMember,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import {
  okNoStore,
  err,
  dbErr,
  unauthorized,
} from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";

const registerSchema = z.object({
  platform: z.enum(["ios", "android", "web"]),
  token: z.string().min(10).max(512),
  bundleId: z.string().max(256).optional(),
  appVersion: z.string().max(64).optional(),
  deviceModel: z.string().max(128).optional(),
  locale: z.string().max(16).optional(),
});

const deregisterSchema = z.object({
  token: z.string().min(10).max(512),
});

/**
 * Register or refresh an APNs / FCM / Web push token for the current user.
 * Idempotent on (user_id, token) — calling repeatedly just refreshes
 * last_seen_at and any device metadata.
 */
export async function POST(request: NextRequest) {
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const parsed = await parseJson(request, registerSchema);
  if (!parsed.ok) return parsed.response;
  const { platform, token, bundleId, appVersion, deviceModel, locale } =
    parsed.data;

  const supabase = createSupabaseForUser(request);
  // device_tokens has unique (user_id, token); rely on it for upsert.
  const { error } = await supabase
    .from("device_tokens" as never)
    .upsert(
      {
        mosque_id: ctx.mosqueId,
        user_id: ctx.userId,
        platform,
        token,
        bundle_id: bundleId ?? null,
        app_version: appVersion ?? null,
        device_model: deviceModel ?? null,
        locale: locale ?? null,
        last_seen_at: new Date().toISOString(),
        created_by: ctx.userId,
        updated_by: ctx.userId,
      } as never,
      { onConflict: "user_id,token" },
    );
  if (error) return dbErr(error.message, 400, "device_register_failed");

  return okNoStore({ registered: true });
}

/**
 * Remove a device token (typically on logout from the iOS app).
 */
export async function DELETE(request: NextRequest) {
  const user = await extractUser(request);
  if (!user) return unauthorized();

  const parsed = await parseJson(request, deregisterSchema);
  if (!parsed.ok) return parsed.response;
  const { token } = parsed.data;

  const supabase = createSupabaseForUser(request);
  const { error } = await supabase
    .from("device_tokens" as never)
    .delete()
    .eq("user_id", user.userId)
    .eq("token", token);
  if (error) return dbErr(error.message, 400, "device_delete_failed");

  return okNoStore({ deleted: true });
}
