"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checkStudentLimit } from "@/lib/student-limit";

export async function createStudent(formData: FormData): Promise<{ error: string } | void> {
  const ctx = await requireAdmin();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const dobRaw = String(formData.get("date_of_birth") ?? "").trim();
  const date_of_birth = dobRaw === "" ? null : dobRaw;
  if (!full_name) return;

  const limitError = await checkStudentLimit(ctx.mosqueId);
  if (limitError) return { error: limitError };

  const supabase = await createClient();
  await supabase.from("student_profiles").insert({
    mosque_id: ctx.mosqueId,
    full_name,
    date_of_birth,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  revalidatePath("/", "layout");
}
