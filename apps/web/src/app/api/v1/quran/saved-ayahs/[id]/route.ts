import { NextRequest } from "next/server";

import {
  extractUser,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, notFound, unauthorized } from "@/app/api/v1/helpers/response";

/** Removes one saved ayah. RLS already restricts this to the owner. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await extractUser(request);
  if (!user) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  // `.select()` tells us whether a row actually matched, so deleting someone
  // else's id returns 404 rather than a misleading success.
  const { data, error } = await supabase
    .from("quran_saved_ayahs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.userId)
    .select("id")
    .maybeSingle();

  if (error) return dbErr(error.message);
  if (!data) return notFound("Saved ayah not found.");

  return ok({ deleted: true });
}
