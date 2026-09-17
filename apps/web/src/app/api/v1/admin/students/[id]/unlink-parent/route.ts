import { NextRequest } from "next/server";

import {
  requireApiAdmin,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, unauthorized } from "@/app/api/v1/helpers/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const { id: studentId } = await params;

  let body: { link_id?: string };
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON body");
  }

  const linkId = (body.link_id ?? "").trim();
  if (!linkId) return err("link_id is required.");

  const supabase = await createSupabaseForUser(request);
  await supabase
    .from("parent_student_links")
    .delete()
    .eq("id", linkId)
    .eq("mosque_id", ctx.mosqueId);

  return ok({ unlinked: true });
}
