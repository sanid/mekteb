import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Health check for uptime monitors and cron-driven alerting (open.md §4).
 *
 * A `200` means the instance is up AND the database answers — the failure an
 * uptime monitor that only checks the homepage cannot see. Monitors (Better
 * Uptime, Checkly, Vercel Cron + a chat/webhook) should hit this endpoint.
 *
 * Deliberately unauthenticated: a health check that requires a secret fails
 * when the secret rotation is what you are trying to detect. It only ever
 * performs a trivial `select 1`, so there is nothing to protect.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        status: "degraded",
        checks: {
          database: { ok: false, error: "database not configured" },
        },
        uptime: 0,
      },
      { status: 503 },
    );
  }

  try {
    const admin = createAdminClient();
    // A bare `select 1` — the whole point is to prove the connection and the
    // pool, not to exercise the schema. RLS is bypassed by the service role,
    // so a broken RLS policy cannot false-negative the monitor.
    const { data, error } = await admin.from("mosques").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: "degraded",
          checks: { database: { ok: false, error: error.message } },
          uptime: Date.now() - started,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "ok",
      checks: {
        database: { ok: true, rows: data?.length ?? 0 },
      },
      uptime: Date.now() - started,
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "down",
        checks: {
          database: {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          },
        },
        uptime: Date.now() - started,
      },
      { status: 500 },
    );
  }
}
