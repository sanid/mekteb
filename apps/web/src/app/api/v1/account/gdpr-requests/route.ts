import { NextRequest } from "next/server";

import {
  extractUser,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { okNoStore, unauthorized, err } from "@/app/api/v1/helpers/response";

/**
 * Lists the current user's own GDPR (export / deletion) requests.
 * RLS restricts the result to rows where user_id = auth.uid().
 */
export async function GET(request: NextRequest) {
  const user = await extractUser(request);
  if (!user) return unauthorized();

  const supabase = createSupabaseForUser(request);
  const { data, error } = await supabase
    .from("gdpr_requests")
    .select(
      "id, type, status, reason, requested_at, processed_at, created_at",
    )
    .eq("user_id", user.userId)
    .order("requested_at", { ascending: false })
    .limit(50);

  if (error) return err(error.message);
  return okNoStore({ requests: data ?? [] });
}
