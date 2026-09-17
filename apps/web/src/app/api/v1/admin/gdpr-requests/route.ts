import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiAdmin,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { okNoStore, err, unauthorized } from "@/app/api/v1/helpers/response";
import { parseQuery } from "@/app/api/v1/helpers/validate";

const querySchema = z.object({
  status: z
    .enum(["pending", "processing", "sent", "completed", "rejected", "failed"])
    .optional(),
  type: z.enum(["export", "deletion"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export async function GET(request: NextRequest) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const parsed = parseQuery(request, querySchema);
  if (!parsed.ok) return parsed.response;
  const { status, type, limit } = parsed.data;

  const supabase = createSupabaseForUser(request);
  let q = supabase
    .from("gdpr_requests")
    .select(
      "id, user_id, email, type, status, reason, requested_at, processed_at, processed_by",
    )
    .eq("mosque_id", ctx.mosqueId)
    .order("requested_at", { ascending: false })
    .limit(limit);
  if (status) q = q.eq("status", status);
  if (type) q = q.eq("type", type);

  const { data, error } = await q;
  if (error) return err(error.message);
  return okNoStore({ requests: data ?? [] });
}
