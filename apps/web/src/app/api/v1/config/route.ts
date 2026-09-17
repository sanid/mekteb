import { NextRequest } from "next/server";

import { requireApiMember } from "@/app/api/v1/helpers/api-auth";
import { okNoStore, err, unauthorized } from "@/app/api/v1/helpers/response";

/**
 * What the app needs to open a Realtime socket.
 *
 * Realtime is the one exception to "never talk to Supabase directly"
 * (AGENTS.md §1) — a websocket cannot be proxied through `/api/v1` without
 * reimplementing it — so the app needs the project URL and the anon key. The
 * anon key is public by design and enforces nothing; RLS does.
 *
 * Served rather than baked into the build because the app has no build-time
 * knowledge of which environment it will point at: `EXPO_PUBLIC_API_URL` (or
 * the Metro host in development) decides that at runtime, and Supabase has to
 * follow it.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!configured || !anonKey) {
    return err("Realtime is not configured on this server", 503, "no_realtime");
  }

  return okNoStore({
    supabaseUrl: reachableFrom(request, configured),
    supabaseAnonKey: anonKey,
  });
}

/**
 * In local development `NEXT_PUBLIC_SUPABASE_URL` is `127.0.0.1:54321`, which
 * on a phone means *the phone*. The device reached this route over the LAN, so
 * the host it used is by definition one that works — reuse it and keep the
 * Supabase port.
 *
 * Only loopback is rewritten. A real hostname is left exactly as configured,
 * so this cannot rewrite a production URL into something local.
 */
function reachableFrom(request: NextRequest, configured: string): string {
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    return configured;
  }

  const isLoopback =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "::1";
  if (!isLoopback) return configured;

  const callerHost = request.headers.get("host")?.split(":")[0];
  if (!callerHost || callerHost === "localhost" || callerHost === "127.0.0.1") {
    return configured;
  }

  url.hostname = callerHost;
  return url.toString().replace(/\/$/, "");
}
