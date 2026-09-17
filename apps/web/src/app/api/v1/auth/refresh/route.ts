import { NextRequest } from "next/server";
import { z } from "zod";

import { checkRateLimit } from "@/lib/rate-limit";
import { okNoStore, err, tooMany } from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

const schema = z.object({
  refreshToken: z.string().min(10),
});

export async function POST(request: NextRequest) {
  const parsed = await parseJson(request, schema);
  if (!parsed.ok) return parsed.response;
  const { refreshToken } = parsed.data;

  const limit = await checkRateLimit({
    bucket: "refresh",
    windowMs: 60 * 1000,
    maxRequests: 60,
  });
  if (!limit.allowed) {
    return tooMany("Too many refresh attempts.", limit.retryAfterMs);
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    return err(
      error?.message ?? "Refresh failed.",
      401,
      "invalid_refresh_token",
    );
  }

  return okNoStore({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
    expiresAt: data.session.expires_at,
    tokenType: data.session.token_type,
    userId: data.user?.id,
  });
}
