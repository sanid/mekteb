import { NextRequest } from "next/server";

import { requireApiAdmin, createSupabaseForUser } from "@/app/api/v1/helpers/api-auth";
import { ok, unauthorized } from "@/app/api/v1/helpers/response";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eid: string }> },
) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const { eid } = await params;
  const supabase = await createSupabaseForUser(request);

  await supabase
    .from("group_enrollments")
    .update({ is_active: false, ended_at: new Date().toISOString().slice(0, 10) })
    .eq("id", eid);

  return ok({ unenrolled: true });
}
