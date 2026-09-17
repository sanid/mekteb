import { NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseForUser, extractUser, resolveApiRole } from "@/app/api/v1/helpers/api-auth";
import { ok, err, unauthorized } from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";

const schema = z.object({
  factorId: z.string().min(1),
  challengeId: z.string().min(1),
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  const user = await extractUser(request);
  if (!user) return unauthorized();

  const parsed = await parseJson(request, schema);
  if (!parsed.ok) return parsed.response;
  const { factorId, challengeId, code } = parsed.data;

  const supabase = createSupabaseForUser(request);

  // mfa.verify returns the new session directly in `data`
  const { data, error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
  if (error || !data) return err(error?.message ?? "MFA verification failed.");

  // `data` is a Session object — access_token, refresh_token etc. are top-level
  const session = data as unknown as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number;
  };

  const role = await resolveApiRole(user.userId, new Request(request.url, {
    headers: { authorization: `Bearer ${session.access_token}` },
  }));

  return ok({
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
    expiresAt: session.expires_at,
    role,
  });
}
