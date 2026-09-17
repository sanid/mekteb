import { NextRequest } from "next/server";

import {
  requireApiAdmin,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const { id: studentId } = await params;

  let body: { parent_profile_id?: string };
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON body");
  }

  const parentProfileId = (body.parent_profile_id ?? "").trim();
  if (!parentProfileId) return err("parent_profile_id is required.");

  const supabase = await createSupabaseForUser(request);

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("id", studentId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!student) return err("Student not found.");

  const { data: parent } = await supabase
    .from("parent_profiles")
    .select("id")
    .eq("id", parentProfileId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!parent) return err("Parent not found.");

  const { error } = await supabase.from("parent_student_links").insert({
    mosque_id: ctx.mosqueId,
    parent_profile_id: parentProfileId,
    student_profile_id: studentId,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });

  if (error) {
    if (error.code === "23505") return err("Already linked.");
    return dbErr(error.message);
  }

  return ok({ linked: true });
}
