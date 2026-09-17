import { NextRequest } from "next/server";
import { z } from "zod";

import type { Database } from "@/lib/supabase/types";
import {
  extractUser,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";

const patchSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  displayName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  const user = await extractUser(request);
  if (!user) return unauthorized();

  const parsed = await parseJson(request, patchSchema);
  if (!parsed.ok) return parsed.response;
  const { fullName, displayName, phone } = parsed.data;

  const update: Database["public"]["Tables"]["profiles"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if (fullName !== undefined) update.full_name = fullName;
  if (displayName !== undefined) update.display_name = displayName;
  if (phone !== undefined) update.phone = phone === "" ? null : phone;

  const supabase = createSupabaseForUser(request);
  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.userId)
    .select("full_name, display_name, phone, avatar_url")
    .single();

  if (error) return dbErr(error.message);
  return ok(data);
}
