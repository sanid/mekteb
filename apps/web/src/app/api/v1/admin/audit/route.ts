import { NextRequest } from "next/server";

import {
  requireApiAdmin,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { escapeLikeWildcards } from "@/app/api/v1/helpers/validate";

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const actionFilter = url.searchParams.get("action")?.trim() || null;
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createSupabaseForUser(request);

  let query = supabase
    .from("audit_logs")
    .select(
      "id, action, actor_user_id, target_table, target_id, metadata, created_at",
      { count: "exact" },
    )
    .eq("mosque_id", admin.mosqueId)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (actionFilter) {
    query = query.ilike("action", `%${escapeLikeWildcards(actionFilter)}%`);
  }

  const { data: logs, count, error } = await query;
  if (error) return dbErr(error.message);

  const actorIds = [
    ...new Set((logs ?? []).map((l) => l.actor_user_id).filter(Boolean)),
  ] as string[];

  let profileMap = new Map<string, string | null>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, display_name")
      .in("id", actorIds);
    profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.display_name ?? p.full_name ?? null]),
    );
  }

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return ok({
    logs: logs ?? [],
    page,
    totalPages,
    total: count ?? 0,
    actors: Object.fromEntries(profileMap),
  });
}
