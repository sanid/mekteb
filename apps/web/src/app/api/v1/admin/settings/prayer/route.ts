import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiAdmin,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, okNoStore, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";
import { writeAuditLog } from "@/lib/audit";

const putSchema = z.object({
  prayer_location: z.string().trim().min(1, "A location is required"),
  prayer_method: z.string().trim().default("MWL"),
});

// The same methods `PRAYER_METHODS` in `lib/prayer-times.ts` exposes —
// AlAdhan maps each to a numeric id, so only these are valid to store.
const PRAYER_METHODS = ["MWL", "ISNA", "Egypt", "Makkah", "Karachi", "Tehran", "Jafari"] as const;

/**
 * Where the mosque's prayer timetable is computed for. The mobile home card
 * renders the resulting times; this is the admin's edit handle for the same
 * settings the web settings page saves (`savePrayerSettings`).
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);
  const { data, error } = await supabase
    .from("mosques")
    .select("prayer_location, prayer_method")
    .eq("id", ctx.mosqueId)
    .single();
  if (error) return dbErr(error.message);

  return okNoStore(data);
}

export async function PUT(request: NextRequest) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const parsed = await parseJson(request, putSchema);
  if (!parsed.ok) return parsed.response;
  const { prayer_location, prayer_method } = parsed.data;

  if (!(PRAYER_METHODS as readonly string[]).includes(prayer_method)) {
    return dbErr("Unknown calculation method");
  }

  const supabase = await createSupabaseForUser(request);
  const { error } = await supabase
    .from("mosques")
    .update({
      prayer_location,
      prayer_method,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.mosqueId);
  if (error) return dbErr(error.message);

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "settings.prayer_saved",
    targetTable: "mosques",
    targetId: ctx.mosqueId,
    metadata: { location: prayer_location, method: prayer_method },
  });

  return ok({ prayer_location, prayer_method });
}
