import { NextRequest } from "next/server";

import {
  requireApiMember,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

export async function GET(request: NextRequest) {
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const { data: contacts, error } = await supabase.rpc("messaging_contacts", {
    p_mosque_id: ctx.mosqueId,
  });

  if (error) return dbErr(error.message);

  const recipients = (contacts ?? []).map(
    (c: { profile_id: string; name: string | null; role: string }) => ({
      id: c.profile_id,
      name: c.name ?? c.profile_id,
      role: c.role,
    }),
  );

  return ok(recipients);
}
