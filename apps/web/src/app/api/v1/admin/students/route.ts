import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiAdmin,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import {
  escapeLikeWildcards,
  parseJson,
  parseQuery,
} from "@/app/api/v1/helpers/validate";

const querySchema = z.object({
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

const postSchema = z.object({
  full_name: z.string().trim().min(1, "full_name is required."),
  date_of_birth: z.string().trim().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const parsedQuery = parseQuery(request, querySchema);
  if (!parsedQuery.ok) return parsedQuery.response;
  const { q, limit, offset } = parsedQuery.data;

  const supabase = createSupabaseForUser(request);

  let query = supabase
    .from("student_profiles")
    .select("id, full_name, date_of_birth, is_active, created_at", {
      count: "exact",
    })
    .eq("mosque_id", ctx.mosqueId)
    .order("full_name")
    .range(offset, offset + limit - 1);

  if (q && q.trim()) {
    query = query.ilike("full_name", `%${escapeLikeWildcards(q.trim())}%`);
  }

  const [{ data: students, count }, { data: links }] = await Promise.all([
    query,
    supabase
      .from("parent_student_links")
      .select(
        "id, student_profile_id, parent_profiles(id, relation, profiles(full_name, display_name))",
      )
      .eq("mosque_id", ctx.mosqueId),
  ]);

  const parentsByStudent: Record<string, string[]> = {};
  for (const l of links ?? []) {
    const parent = l.parent_profiles as {
      profiles: {
        full_name: string | null;
        display_name: string | null;
      } | null;
    } | null;
    const name = parent?.profiles?.display_name ?? parent?.profiles?.full_name;
    if (!name) continue;
    (parentsByStudent[l.student_profile_id] ??= []).push(name);
  }

  return ok({
    students: students ?? [],
    parentsByStudent,
    pagination: {
      limit,
      offset,
      total: count ?? null,
      nextOffset:
        students && students.length === limit ? offset + limit : null,
    },
  });
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const parsed = await parseJson(request, postSchema);
  if (!parsed.ok) return parsed.response;
  const { full_name, date_of_birth } = parsed.data;

  const supabase = createSupabaseForUser(request);
  const { data: student, error: insertErr } = await supabase
    .from("student_profiles")
    .insert({
      mosque_id: ctx.mosqueId,
      full_name: full_name.trim(),
      date_of_birth: date_of_birth?.trim() || null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id, full_name, date_of_birth, is_active, created_at")
    .single();

  if (insertErr) return dbErr(insertErr.message);

  return ok(student, 201);
}
