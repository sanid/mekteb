import { NextRequest } from "next/server";

import {
  requireApiMember,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, unauthorized } from "@/app/api/v1/helpers/response";
import { requireApiPlugin } from "@/app/api/v1/helpers/plugins";
import { PRAYER_METHODS, type PrayerMethod } from "@/lib/prayer-times";
import {
  fetchPrayerTimesByLocation,
  fetchPrayerTimesByCoordinates,
} from "@/lib/aladhan";

const VALID_METHODS = new Set(PRAYER_METHODS.map((m) => m.id));

/**
 * Today's prayer times for the caller's mosque.
 *
 * Mirrors the web `PrayerTimesSection`: gated on the `prayer_times` plugin,
 * uses the mosque's stored location (falling back to its coordinates), and
 * resolves through the AlAdhan API. Returns `prayerTimes: null` when the
 * mosque hasn't set a location yet — the client renders nothing instead of
 * an error.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const gate = await requireApiPlugin(request, ctx.mosqueId, "prayer_times");
  if (gate) return gate;

  const supabase = await createSupabaseForUser(request);
  const { data: mosque } = await supabase
    .from("mosques")
    .select("prayer_location, prayer_method, latitude, longitude")
    .eq("id", ctx.mosqueId)
    .maybeSingle();

  if (!mosque) return ok({ prayerTimes: null, date: null });

  const method =
    mosque.prayer_method && VALID_METHODS.has(mosque.prayer_method as PrayerMethod)
      ? (mosque.prayer_method as PrayerMethod)
      : "MWL";

  const result =
    mosque.prayer_location?.trim()
      ? await fetchPrayerTimesByLocation(mosque.prayer_location, method)
      : mosque.latitude != null && mosque.longitude != null
        ? await fetchPrayerTimesByCoordinates(mosque.latitude, mosque.longitude, method)
        : null;

  return ok({
    prayerTimes: result?.times ?? null,
    date: new Date().toISOString().slice(0, 10),
  });
}
