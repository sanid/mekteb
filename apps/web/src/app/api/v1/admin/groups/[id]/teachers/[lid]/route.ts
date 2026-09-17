import { NextRequest } from "next/server";

import { requireApiAdmin, createSupabaseForUser } from "@/app/api/v1/helpers/api-auth";
import { ok, unauthorized } from "@/app/api/v1/helpers/response";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lid: string }> },
) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const { lid } = await params;
  const supabase = await createSupabaseForUser(request);

  await supabase
    .from("teacher_group_links")
    .update({ is_active: false })
    .eq("id", lid);

  return ok({ unassigned: true });
}
