import { NextRequest } from "next/server";

import {
  createSupabaseForUser,
  requireApiMember,
  resolveApiRole,
} from "@/app/api/v1/helpers/api-auth";
import { badRequest, okNoStore, unauthorized } from "@/app/api/v1/helpers/response";
import { requireApiPlugin } from "@/app/api/v1/helpers/plugins";
import { addDays, isoDate, loadCalendarWeek, startOfWeek } from "@/lib/calendar-data";

/**
 * The mobile app's window onto the shared calendar.
 *
 * Everything about *what* a given role sees lives in `@/lib/calendar-data`,
 * which the web portals call directly — this route is the HTTP wrapper around
 * it: authenticate, validate the range, hand over a request-scoped client.
 *
 * That client matters. An earlier version of this file built the cookie-backed
 * `createClient()` here, which is anonymous for a bearer-authenticated request:
 * holidays came back empty and the mosque's federal state silently fell back
 * to Berlin. Always `createSupabaseForUser(request)` in `/api/v1`.
 */

/** Widest window one request may ask for. A week view asks for seven days. */
const MAX_RANGE_DAYS = 62;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function daysBetween(from: string, to: string): number {
  return (Date.parse(to) - Date.parse(from)) / 86_400_000;
}

export async function GET(request: NextRequest) {
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  // Per-mosque feature switch, same as the web portals. Without this the app
  // would keep showing a calendar a mosque had turned off.
  const gate = await requireApiPlugin(request, ctx.mosqueId, "calendar");
  if (gate) return gate;

  const role = await resolveApiRole(ctx.userId, request);
  const supabase = createSupabaseForUser(request);

  const params = request.nextUrl.searchParams;
  const monday = startOfWeek(new Date());

  const from = params.get("from") ?? isoDate(monday);
  const to = params.get("to") ?? isoDate(addDays(monday, 6));

  if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) {
    return badRequest("from and to must be YYYY-MM-DD dates.");
  }
  const span = daysBetween(from, to);
  if (Number.isNaN(span) || span < 0) {
    return badRequest("to must not be before from.");
  }
  if (span > MAX_RANGE_DAYS) {
    return badRequest(`Range must not exceed ${MAX_RANGE_DAYS} days.`);
  }

  const week = await loadCalendarWeek({
    supabase,
    userId: ctx.userId,
    mosqueId: ctx.mosqueId,
    role,
    from,
    to,
    scope: params.get("scope") === "mosque" ? "mosque" : "mine",
  });

  return okNoStore(week);
}
