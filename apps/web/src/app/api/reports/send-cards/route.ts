import { NextResponse } from "next/server";

import { log } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReportCardsForMosque, type SendSummary } from "@/lib/report-card";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    log.error("[reports] CRON_SECRET not set — rejecting request");
    return false;
  }
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Only mosques that have the annual-report feature enabled receive cards.
  const { data: enabled } = await admin
    .from("mosque_plugins")
    .select("mosque_id")
    .eq("plugin_id", "annual_report")
    .eq("is_active", true);

  const mosqueIds = [...new Set((enabled ?? []).map((r) => r.mosque_id))];
  if (mosqueIds.length === 0) {
    return NextResponse.json({ mosques: 0 });
  }

  const { data: mosques } = await admin
    .from("mosques")
    .select("id, locale, school_year_start")
    .in("id", mosqueIds)
    .eq("is_active", true);

  const totals: SendSummary = { processed: 0, emailed: 0, skipped: 0, failed: 0 };
  for (const m of mosques ?? []) {
    const since = m.school_year_start ?? new Date().toISOString().slice(0, 10);
    const summary = await sendReportCardsForMosque(m.id, since, m.locale ?? "de", { limit: 100 });
    totals.processed += summary.processed;
    totals.emailed += summary.emailed;
    totals.skipped += summary.skipped;
    totals.failed += summary.failed;
  }

  return NextResponse.json({ mosques: (mosques ?? []).length, ...totals });
}
