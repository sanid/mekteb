import { NextRequest } from "next/server";

import {
  requireApiParent,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

export async function GET(request: NextRequest) {
  const ctx = await requireApiParent(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const { data: links, error } = await supabase
    .from("parent_student_links")
    .select(
      "id, student_profile_id, student_profiles(id, full_name, date_of_birth, is_active)",
    )
    .eq("parent_profile_id", ctx.parentProfileId)
    .eq("mosque_id", ctx.mosqueId);

  if (error) return dbErr(error.message);

  const children = (links ?? []).map((l) => {
    const sp = (l as unknown as {
      student_profiles: {
        id: string;
        full_name: string;
        date_of_birth: string | null;
        is_active: boolean;
      } | null;
    }).student_profiles;
    return sp
      ? {
          id: sp.id,
          fullName: sp.full_name,
          dateOfBirth: sp.date_of_birth,
          isActive: sp.is_active,
        }
      : null;
  }).filter((c): c is NonNullable<typeof c> => c !== null);

  return ok(children);
}
