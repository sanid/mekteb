import { NextRequest } from "next/server";
import { requireApiTeacher, createSupabaseForUser } from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

export async function GET(request: NextRequest) {
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const { data, error } = await supabase
    .from("exam_requests")
    .select("id, group_id, student_profile_id, notes, status, created_at, student_profiles(full_name), groups(name)")
    .eq("requested_by", ctx.teacherProfileId)
    .order("created_at", { ascending: false });

  if (error) return dbErr(error.message);
  return ok(data);
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const body = await request.json();
  const studentProfileId = String(body.student_profile_id ?? "").trim();
  const groupId = String(body.group_id ?? "").trim();
  const notes = String(body.notes ?? "").trim() || null;

  if (!studentProfileId) return err("student_profile_id is required");
  if (!groupId) return err("group_id is required");

  const supabase = await createSupabaseForUser(request);

  const { data: existing } = await supabase
    .from("exam_requests")
    .select("id")
    .eq("student_profile_id", studentProfileId)
    .eq("group_id", groupId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) return err("A pending request already exists for this student in this group");

  const { data, error } = await supabase
    .from("exam_requests")
    .insert({
      mosque_id: ctx.mosqueId,
      student_profile_id: studentProfileId,
      group_id: groupId,
      requested_by: ctx.teacherProfileId,
      notes,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id, group_id, student_profile_id, status, notes, created_at, student_profiles(full_name), groups(name)")
    .single();

  if (error) return dbErr(error.message);
  return ok(data, 201);
}
