import { NextRequest } from "next/server";

import {
  requireApiStudent,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { requireApiPlugin } from "@/app/api/v1/helpers/plugins";

/** A juz is 20 pages of the standard 604-page mushaf. */
const PAGES_TOTAL = 604;

/**
 * The signed-in student's memorisation progress.
 *
 * Read-only on purpose: `hifz_progress` is keyed on
 * `(student_profile_id, group_id)` and written by the teacher who assessed
 * the student — see `updateHifzProgress` in the teacher actions. Students see
 * it in the Quran reader; they do not set it.
 *
 * A student can be in more than one hifz group, so this returns a row per
 * group plus a combined total.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiStudent(request);
  if (!ctx) return unauthorized();

  const gate = await requireApiPlugin(request, ctx.mosqueId, "quran_hifz");
  if (gate) return gate;

  const supabase = await createSupabaseForUser(request);

  const { data, error } = await supabase
    .from("hifz_progress")
    .select("group_id, pages_memorized, notes, updated_at, groups(name)")
    .eq("student_profile_id", ctx.studentProfileId)
    .eq("mosque_id", ctx.mosqueId);

  if (error) return dbErr(error.message);

  const groups = (data ?? []).map((row) => {
    const group = row.groups as { name: string } | null;
    return {
      groupId: row.group_id,
      groupName: group?.name ?? null,
      pagesMemorized: row.pages_memorized,
      notes: row.notes,
      updatedAt: row.updated_at,
    };
  });

  const pagesMemorized = groups.reduce((sum, g) => sum + (g.pagesMemorized ?? 0), 0);

  return ok({
    pagesMemorized,
    pagesTotal: PAGES_TOTAL,
    juzMemorized: Math.floor(pagesMemorized / 20),
    percentComplete: Math.round((pagesMemorized / PAGES_TOTAL) * 100),
    groups,
  });
}
