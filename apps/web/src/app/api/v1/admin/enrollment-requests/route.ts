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
    .enum(["pending", "approved", "rejected"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

/**
 * The admin enrolment-request queue — the mobile half of the web
 * `/admin/enrollment` page. RLS lets mosque admins read every row of their
 * own mosque (see `20260612000000_enrollment_requests.sql`); the public form
 * writes through the service role and never touches this route.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const parsed = parseQuery(request, querySchema);
  if (!parsed.ok) return parsed.response;
  const { status, limit } = parsed.data;

  const supabase = createSupabaseForUser(request);
  let q = supabase
    .from("enrollment_requests")
    .select(
      "id, parent_name, parent_email, parent_phone, child_name, child_birth_year, message, status, created_at",
    )
    .eq("mosque_id", ctx.mosqueId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return err(error.message);

  const pending = (data ?? []).filter((r) => r.status === "pending").length;
  return okNoStore({ requests: data ?? [], pendingCount: pending });
}
