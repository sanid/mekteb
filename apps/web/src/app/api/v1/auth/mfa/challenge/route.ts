import { NextRequest } from "next/server";
import { createSupabaseForUser, extractUser } from "@/app/api/v1/helpers/api-auth";
import { ok, err, unauthorized } from "@/app/api/v1/helpers/response";

export async function POST(request: NextRequest) {
  const user = await extractUser(request);
  if (!user) return unauthorized();

  const supabase = createSupabaseForUser(request);

  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) return err(factorsError.message);

  const verified = (factors?.totp ?? []).filter((f) => f.status === "verified");
  if (verified.length === 0) return err("No verified MFA factors found.");

  const factorId = verified[0].id;
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError || !challenge) return err(challengeError?.message ?? "Failed to create challenge.");

  return ok({ factorId, challengeId: challenge.id });
}
