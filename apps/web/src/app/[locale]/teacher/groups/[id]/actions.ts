"use server";

import { revalidatePath } from "next/cache";

import { requireTeacher } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { generateTempPassword, otpExpiresAt } from "@/lib/onboarding";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkStudentLimit } from "@/lib/student-limit";
import { getActivePlugins } from "@/lib/plugins";
import { buildStudentEmail, qualifiedUsername } from "@/lib/student-auth";
import { dbActionErr, type ActionResult } from "@/lib/action-result";
import { actionError, actionErrorState } from "@/lib/action-errors";

type AudienceChoice = "group" | "individual";
type CreatePersonResult =
  | { ok: true; email: string; full_name: string; tempPassword: string; expires_at: string; username?: string }
  | { ok: false; error: string };

/**
 * Confirms the caller is the assigned teacher for `groupId` before any
 * write. RLS enforces this as well, but the explicit check fails fast with
 * a cleaner no-op and keeps the action out of the error path.
 */
async function assertTeacherOfGroup(
  teacherProfileId: string,
  groupId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teacher_group_links")
    .select("id")
    .eq("teacher_profile_id", teacherProfileId)
    .eq("group_id", groupId)
    .eq("is_active", true)
    .maybeSingle();
  return Boolean(data);
}

export async function setAttendance(
  groupId: string,
  input: { date: string; studentId: string; status: "present" | "absent" | "late" | "excused" },
): Promise<ActionResult> {
  const ctx = await requireTeacher();
  if (!(await assertTeacherOfGroup(ctx.teacherProfileId, groupId)))
    return await actionError("not_authorised_for_group");
  if (!input.date || !input.studentId) return await actionError("missing_fields");

  const supabase = await createClient();
  const { data: session, error: sessionError } = await supabase
    .from("attendance_sessions")
    .upsert(
      {
        mosque_id: ctx.mosqueId,
        group_id: groupId,
        session_date: input.date,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
      { onConflict: "group_id,session_date" },
    )
    .select("id")
    .single();
  if (sessionError || !session) return { error: sessionError?.message ?? "Failed to save session" };

  const { error: recordError } = await supabase
    .from("attendance_records")
    .upsert(
      {
        mosque_id: ctx.mosqueId,
        session_id: session.id,
        student_profile_id: input.studentId,
        status: input.status,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
      { onConflict: "session_id,student_profile_id" },
    );
  if (recordError) return await dbActionErr(recordError.message, "setAttendance");

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "attendance.recorded", targetTable: "attendance_records", targetId: null,
    metadata: { session_id: session.id, student_profile_id: input.studentId, status: input.status, date: input.date },
  });

  revalidatePath(`/[locale]/teacher/groups/${groupId}`, "page");
  return { ok: true };
}

export async function openCheckin(
  groupId: string,
  date: string,
): Promise<{ error: string } | { ok: true; token: string }> {
  const ctx = await requireTeacher();
  if (!(await assertTeacherOfGroup(ctx.teacherProfileId, groupId)))
    return await actionError("not_authorised_for_group");
  if (!date) return await actionError("date_required");

  // Student QR Check-In plugin gate: the feature is off, so refuse to open
  // a new session (closing an existing one is still allowed for cleanup).
  const activePlugins = await getActivePlugins(ctx.mosqueId);
  if (!activePlugins.has("student_checkin")) {
    return await actionError("feature_disabled");
  }

  const supabase = await createClient();
  const { data: session, error: sessionError } = await supabase
    .from("attendance_sessions")
    .upsert(
      {
        mosque_id: ctx.mosqueId,
        group_id: groupId,
        session_date: date,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
      { onConflict: "group_id,session_date" },
    )
    .select("id")
    .single();
  if (sessionError || !session) return { error: sessionError?.message ?? "Failed to open session" };

  const token = crypto.randomUUID();
  const { error } = await supabase
    .from("attendance_sessions")
    .update({
      checkin_token: token,
      checkin_active: true,
      checkin_opened_at: new Date().toISOString(),
      updated_by: ctx.userId,
    })
    .eq("id", session.id);
  if (error) return await dbActionErr(error.message, "openCheckin");

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "checkin.opened", targetTable: "attendance_sessions", targetId: session.id,
    metadata: { group_id: groupId, date },
  });

  revalidatePath(`/[locale]/teacher/groups/${groupId}`, "page");
  return { ok: true, token };
}

export async function closeCheckin(
  groupId: string,
  date: string,
): Promise<ActionResult> {
  const ctx = await requireTeacher();
  if (!(await assertTeacherOfGroup(ctx.teacherProfileId, groupId)))
    return await actionError("not_authorised_for_group");

  const supabase = await createClient();
  const { error } = await supabase
    .from("attendance_sessions")
    .update({ checkin_active: false, updated_by: ctx.userId })
    .eq("mosque_id", ctx.mosqueId)
    .eq("group_id", groupId)
    .eq("session_date", date);
  if (error) return await dbActionErr(error.message, "closeCheckin");

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "checkin.closed", targetTable: "attendance_sessions", targetId: null,
    metadata: { group_id: groupId, date },
  });

  revalidatePath(`/[locale]/teacher/groups/${groupId}`, "page");
  return { ok: true };
}

export async function takeAttendance(
  groupId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireTeacher();
  if (!(await assertTeacherOfGroup(ctx.teacherProfileId, groupId)))
    return await actionError("not_authorised_for_group");

  const dateRaw = String(formData.get("session_date") ?? "").trim();
  if (!dateRaw) return await actionError("date_required");
  const session_date = dateRaw;

  const supabase = await createClient();
  const { data: session, error } = await supabase
    .from("attendance_sessions")
    .upsert(
      {
        mosque_id: ctx.mosqueId,
        group_id: groupId,
        session_date,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
      { onConflict: "group_id,session_date" },
    )
    .select("id")
    .single();
  if (error || !session) return { error: error?.message ?? "Failed to save session" };

  const records: Array<{
    mosque_id: string;
    session_id: string;
    student_profile_id: string;
    status: "present" | "absent" | "late" | "excused";
    created_by: string;
    updated_by: string;
  }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("status_")) continue;
    const student_profile_id = key.slice("status_".length);
    const status = String(value) as
      | "present"
      | "absent"
      | "late"
      | "excused";
    records.push({
      mosque_id: ctx.mosqueId,
      session_id: session.id,
      student_profile_id,
      status,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
  }

  if (records.length > 0) {
    const { error: recordsError } = await supabase
      .from("attendance_records")
      .upsert(records, { onConflict: "session_id,student_profile_id" });
    if (recordsError) return await dbActionErr(recordsError.message, "takeAttendance");
  }

  revalidatePath(`/[locale]/teacher/groups/${groupId}`, "page");
  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "attendance.saved", targetTable: "attendance_sessions", targetId: session.id,
    metadata: { group_id: groupId, session_date, record_count: String(records.length) },
  });
  return { ok: true };
}

export async function createHomework(
  groupId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireTeacher();
  if (!(await assertTeacherOfGroup(ctx.teacherProfileId, groupId)))
    return await actionError("not_authorised_for_group");

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;
  const lesson_id = String(formData.get("lesson_id") ?? "").trim() || null;
  const dueRaw = String(formData.get("due_date") ?? "").trim();
  const due_date = dueRaw === "" ? null : dueRaw;
  const audience = String(formData.get("audience") ?? "group") as AudienceChoice;
  const targets = formData.getAll("student_ids").map(String).filter(Boolean);

  if (!title) return await actionError("title_required");
  if (audience === "individual" && targets.length === 0)
    return await actionError("select_at_least_one_student");

  const supabase = await createClient();
  const { data: hw, error } = await supabase
    .from("homework_assignments")
    .insert({
      mosque_id: ctx.mosqueId,
      group_id: groupId,
      lesson_id,
      title,
      body,
      due_date,
      audience,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error || !hw) return { error: error?.message ?? "Failed to create homework" };

  if (audience === "individual") {
    const { error: targetsError } = await supabase
      .from("homework_targets")
      .insert(
        targets.map((student_profile_id) => ({
          mosque_id: ctx.mosqueId,
          homework_id: hw.id,
          student_profile_id,
          created_by: ctx.userId,
          updated_by: ctx.userId,
        })),
      );
    if (targetsError) return await dbActionErr(targetsError.message, "createHomework");
  }

  revalidatePath(`/[locale]/teacher/groups/${groupId}`, "page");
  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "homework.created", targetTable: "homework_assignments", targetId: hw.id,
    metadata: { group_id: groupId, title },
  });
  return { ok: true };
}

export async function addProgressNote(
  groupId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireTeacher();
  if (!(await assertTeacherOfGroup(ctx.teacherProfileId, groupId)))
    return await actionError("not_authorised_for_group");

  const student_profile_id = String(formData.get("student_profile_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const visible_to_parents = formData.get("visible_to_parents") === "on";

  if (!student_profile_id) return await actionError("select_a_student");
  if (!body) return await actionError("note_empty");

  const supabase = await createClient();
  const { error } = await supabase.from("progress_notes").insert({
    mosque_id: ctx.mosqueId,
    group_id: groupId,
    student_profile_id,
    author_profile_id: ctx.userId,
    body,
    visible_to_parents,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (error) return await dbActionErr(error.message, "addProgressNote");

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "progress_note.created", targetTable: "progress_notes", targetId: null,
    metadata: { group_id: groupId, student_profile_id, visible_to_parents },
  });

  revalidatePath(`/[locale]/teacher/groups/${groupId}`, "page");
  return { ok: true };
}

export async function deleteHomework(
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireTeacher();
  const homeworkId = String(formData.get("homework_id") ?? "").trim();
  const groupId = String(formData.get("group_id") ?? "").trim();
  if (!homeworkId || !groupId) return await actionError("missing_parameters");
  if (!(await assertTeacherOfGroup(ctx.teacherProfileId, groupId)))
    return await actionError("not_authorised_for_group");

  const supabase = await createClient();
  const { error } = await supabase
    .from("homework_assignments")
    .delete()
    .eq("id", homeworkId)
    .eq("group_id", groupId)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return await dbActionErr(error.message, "deleteHomework");

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "homework.deleted", targetTable: "homework_assignments", targetId: homeworkId,
  });
  revalidatePath(`/[locale]/teacher/groups/${groupId}`, "page");
  return { ok: true };
}

export async function updateHomework(
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireTeacher();
  const homeworkId = String(formData.get("homework_id") ?? "").trim();
  const groupId = String(formData.get("group_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;
  const dueRaw = String(formData.get("due_date") ?? "").trim();
  const due_date = dueRaw === "" ? null : dueRaw;
  const lesson_id = String(formData.get("lesson_id") ?? "").trim() || null;

  if (!homeworkId || !groupId || !title) return await actionError("title_required");
  if (!(await assertTeacherOfGroup(ctx.teacherProfileId, groupId)))
    return await actionError("not_authorised_for_group");

  const supabase = await createClient();
  const { error } = await supabase
    .from("homework_assignments")
    .update({ title, body, due_date, lesson_id, updated_by: ctx.userId, updated_at: new Date().toISOString() })
    .eq("id", homeworkId)
    .eq("group_id", groupId)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return await dbActionErr(error.message, "updateHomework");

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "homework.updated", targetTable: "homework_assignments", targetId: homeworkId,
    metadata: { group_id: groupId, title },
  });

  revalidatePath(`/[locale]/teacher/groups/${groupId}`, "page");
  return { ok: true };
}

export async function deleteNote(formData: FormData): Promise<ActionResult> {
  const ctx = await requireTeacher();
  const noteId = String(formData.get("note_id") ?? "").trim();
  const groupId = String(formData.get("group_id") ?? "").trim();
  if (!noteId || !groupId) return await actionError("missing_parameters");

  const supabase = await createClient();
  const { error } = await supabase
    .from("progress_notes")
    .delete()
    .eq("id", noteId)
    .eq("author_profile_id", ctx.userId)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return await dbActionErr(error.message, "deleteNote");

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "progress_note.deleted", targetTable: "progress_notes", targetId: noteId,
  });

  revalidatePath(`/[locale]/teacher/groups/${groupId}`, "page");
  revalidatePath("/[locale]/teacher/notes", "page");
  return { ok: true };
}

export async function updateNote(formData: FormData): Promise<ActionResult> {
  const ctx = await requireTeacher();
  const noteId = String(formData.get("note_id") ?? "").trim();
  const groupId = String(formData.get("group_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const visible_to_parents = formData.get("visible_to_parents") === "on";

  if (!noteId || !body) return await actionError("note_empty");

  const supabase = await createClient();
  const { error } = await supabase
    .from("progress_notes")
    .update({ body, visible_to_parents, updated_by: ctx.userId, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .eq("author_profile_id", ctx.userId)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return await dbActionErr(error.message, "updateNote");

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "progress_note.updated", targetTable: "progress_notes", targetId: noteId,
    metadata: { group_id: groupId, visible_to_parents },
  });

  revalidatePath(`/[locale]/teacher/groups/${groupId}`, "page");
  revalidatePath("/[locale]/teacher/notes", "page");
  return { ok: true };
}

export async function upsertWeeklyNote(
  groupId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireTeacher();
  if (!(await assertTeacherOfGroup(ctx.teacherProfileId, groupId)))
    return await actionError("not_authorised_for_group");

  const week_start = String(formData.get("week_start") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const is_published = formData.get("is_published") === "on";

  if (!week_start) return await actionError("week_start_required");
  if (!body) return await actionError("summary_empty");

  const supabase = await createClient();
  const { error } = await supabase
    .from("teacher_weekly_notes")
    .upsert(
      {
        mosque_id: ctx.mosqueId,
        group_id: groupId,
        author_profile_id: ctx.userId,
        week_start,
        body,
        is_published,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
      { onConflict: "group_id,week_start" },
    );
  if (error) return await dbActionErr(error.message, "upsertWeeklyNote");

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "weekly_note.upserted", targetTable: "teacher_weekly_notes", targetId: null,
    metadata: { group_id: groupId, week_start, is_published },
  });

  revalidatePath(`/[locale]/teacher/groups/${groupId}`, "page");
  return { ok: true };
}

export async function createStudentAndEnroll(
  groupId: string,
  _prev: CreatePersonResult | null,
  formData: FormData,
): Promise<CreatePersonResult> {
  const ctx = await requireTeacher();
  if (!(await assertTeacherOfGroup(ctx.teacherProfileId, groupId)))
    return await actionErrorState("not_authorised_for_group");

  const full_name = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const date_of_birth = String(formData.get("date_of_birth") ?? "").trim() || null;
  if (!full_name || !username)
    return await actionErrorState("full_name_and_username_required");

  const limitError = await checkStudentLimit(ctx.mosqueId);
  if (limitError) return { ok: false, error: limitError };

  const admin = createAdminClient();

  // Derive fake internal email from username + mosque slug
  const { data: mosque } = await admin
    .from("mosques")
    .select("slug")
    .eq("id", ctx.mosqueId)
    .single();
  if (!mosque) return await actionErrorState("mosque_not_found");
  const authEmail = buildStudentEmail(username, mosque.slug);
  // Handed to the teacher to pass on — must work off-subdomain too.
  const loginId = qualifiedUsername(username, mosque.slug);

  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: authEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name, display_name: full_name },
  });
  if (createErr || !created.user)
    return { ok: false, error: createErr?.message ?? "Failed to create user." };
  const newUserId = created.user.id;

  await admin
    .from("profiles")
    .update({ must_rotate_password: true, updated_at: new Date().toISOString() })
    .eq("id", newUserId);

  // Students hold NO memberships row — app.is_member() must stay false for
  // them (standing invariant, see test_rls_student.sql). Their access comes
  // from student_profiles alone, so no memberships insert here.

  const { data: studentProfile, error: profileErr } = await admin
    .from("student_profiles")
    .insert({
      mosque_id: ctx.mosqueId,
      profile_id: newUserId,
      full_name,
      username,
      date_of_birth,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id")
    .single();
  if (profileErr || !studentProfile) {
    await admin.auth.admin.deleteUser(newUserId);
    return { ok: false, error: profileErr?.message ?? "Failed to create student profile." };
  }

  const { error: enrollErr } = await admin.from("group_enrollments").insert({
    mosque_id: ctx.mosqueId,
    group_id: groupId,
    student_profile_id: studentProfile.id,
    is_active: true,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (enrollErr) {
    await admin.auth.admin.deleteUser(newUserId);
    return { ok: false, ...await dbActionErr(enrollErr.message, "createStudentAndEnroll") };
  }

  const expires_at = otpExpiresAt();
  await admin.from("otp_issues").insert({
    mosque_id: ctx.mosqueId,
    user_id: newUserId,
    issued_by: ctx.userId,
    expires_at,
    metadata: { role: "student", username },
  });
  await admin.from("password_reset_audit").insert({
    mosque_id: ctx.mosqueId,
    user_id: newUserId,
    actor_user_id: ctx.userId,
    event: "otp_issued",
    metadata: { role: "student", username, expires_at },
  });
  await admin.from("audit_logs").insert({
    mosque_id: ctx.mosqueId,
    actor_user_id: ctx.userId,
    action: "student.account_created",
    target_table: "student_profiles",
    target_id: studentProfile.id,
    metadata: { username, group_id: groupId },
  });

  revalidatePath(`/[locale]/teacher/groups/${groupId}`, "page");
  // `username` here is the login identifier shown to the teacher, not the
  // stored column — that stays bare (see the insert above).
  return { ok: true, email: authEmail, full_name, tempPassword, expires_at, username: loginId };
}

export async function createParentAndLinkStudent(
  groupId: string,
  _prev: CreatePersonResult | null,
  formData: FormData,
): Promise<CreatePersonResult> {
  const ctx = await requireTeacher();
  if (!(await assertTeacherOfGroup(ctx.teacherProfileId, groupId)))
    return await actionErrorState("not_authorised_for_group");

  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const relation = String(formData.get("relation") ?? "").trim() || null;
  const student_profile_id = String(formData.get("student_profile_id") ?? "").trim();
  if (!full_name || !email)
    return await actionErrorState("full_name_and_email_required");
  if (!student_profile_id)
    return await actionErrorState("select_student_to_link");

  const supabase = await createClient();
  const { data: enrollment } = await supabase
    .from("group_enrollments")
    .select("id")
    .eq("group_id", groupId)
    .eq("student_profile_id", student_profile_id)
    .eq("is_active", true)
    .maybeSingle();
  if (!enrollment)
    return await actionErrorState("student_not_enrolled_in_group");

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name, display_name: full_name },
  });
  if (createErr || !created.user)
    return { ok: false, error: createErr?.message ?? "Failed to create user." };
  const newUserId = created.user.id;

  await admin
    .from("profiles")
    .update({ must_rotate_password: true, phone, updated_at: new Date().toISOString() })
    .eq("id", newUserId);

  const { error: membershipErr } = await admin.from("memberships").insert({
    user_id: newUserId,
    mosque_id: ctx.mosqueId,
    role: "parent",
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (membershipErr) {
    await admin.auth.admin.deleteUser(newUserId);
    return { ok: false, ...await dbActionErr(membershipErr.message, "createParentAndLinkStudent") };
  }

  const { data: parentProfile, error: profileErr } = await admin
    .from("parent_profiles")
    .insert({
      mosque_id: ctx.mosqueId,
      profile_id: newUserId,
      relation,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id")
    .single();
  if (profileErr || !parentProfile) {
    await admin.auth.admin.deleteUser(newUserId);
    return { ok: false, error: profileErr?.message ?? "Failed to create parent profile." };
  }

  const { error: linkErr } = await admin.from("parent_student_links").insert({
    mosque_id: ctx.mosqueId,
    parent_profile_id: parentProfile.id,
    student_profile_id,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (linkErr) {
    await admin.auth.admin.deleteUser(newUserId);
    return { ok: false, ...await dbActionErr(linkErr.message, "createParentAndLinkStudent") };
  }

  const expires_at = otpExpiresAt();
  await admin.from("otp_issues").insert({
    mosque_id: ctx.mosqueId,
    user_id: newUserId,
    issued_by: ctx.userId,
    expires_at,
    metadata: { role: "parent", email },
  });
  await admin.from("password_reset_audit").insert({
    mosque_id: ctx.mosqueId,
    user_id: newUserId,
    actor_user_id: ctx.userId,
    event: "otp_issued",
    metadata: { role: "parent", email, expires_at },
  });
  await admin.from("audit_logs").insert({
    mosque_id: ctx.mosqueId,
    actor_user_id: ctx.userId,
    action: "parent.account_created",
    target_table: "parent_profiles",
    target_id: parentProfile.id,
    metadata: { email, student_profile_id, group_id: groupId },
  });

  revalidatePath(`/[locale]/teacher/groups/${groupId}`, "page");
  return { ok: true, email, full_name, tempPassword, expires_at };
}

/**
 * Cancel or restore an upcoming lesson (teaching_session) for a group the
 * teacher teaches. Notifications fan out from the DB trigger
 * (`app.notify_lesson_cancelled`) to enrolled students and their parents;
 * this only flips the flag and audits it.
 */
export async function toggleLessonCancelled(formData: FormData): Promise<ActionResult> {
  const ctx = await requireTeacher();
  const sessionId = String(formData.get("session_id") ?? "").trim();
  const groupId = String(formData.get("group_id") ?? "").trim();
  const isCancelled = formData.get("is_cancelled") === "true";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!sessionId || !groupId) return await actionError("missing_parameters");
  if (!(await assertTeacherOfGroup(ctx.teacherProfileId, groupId)))
    return await actionError("not_authorised_for_group");

  const supabase = await createClient();
  const { error } = await supabase
    .from("teaching_sessions")
    .update({
      is_cancelled: isCancelled,
      // Only write notes when cancelling; restoring clears the reason so the
      // calendar reads clean again.
      notes: isCancelled ? notes : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("group_id", groupId)
    .eq("mosque_id", ctx.mosqueId);

  if (error) return await dbActionErr(error.message, "toggleLessonCancelled");

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: isCancelled ? "lesson.cancelled" : "lesson.restored",
    targetTable: "teaching_sessions",
    targetId: sessionId,
    metadata: { group_id: groupId, notes },
  });

  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function createExamRequest(
  groupId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireTeacher();
  if (!(await assertTeacherOfGroup(ctx.teacherProfileId, groupId)))
    return await actionError("not_authorised_for_group");

  const studentProfileId = String(formData.get("student_profile_id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!studentProfileId) return await actionError("student_required");

  const supabase = await createClient();

  // Derive mosque_id from the group itself so a multi-mosque teacher (or a
  // teacher whose `ctx.mosqueId` resolved to the wrong membership) cannot
  // trip the exam_requests mosque-consistency trigger.
  const { data: group } = await supabase
    .from("groups")
    .select("mosque_id")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return await actionError("group_not_found");
  const mosqueId = group.mosque_id;

  const { data: teacherProfile } = await supabase
    .from("teacher_profiles")
    .select("id")
    .eq("profile_id", ctx.userId)
    .eq("mosque_id", mosqueId)
    .eq("is_active", true)
    .maybeSingle();
  if (!teacherProfile) return await actionError("no_teacher_profile_in_mosque");

  const { data: student } = await supabase
    .from("student_profiles")
    .select("mosque_id")
    .eq("id", studentProfileId)
    .maybeSingle();
  if (!student) return await actionError("student_not_found");
  if (student.mosque_id !== mosqueId)
    return await actionError("student_different_mosque");

  const { data: existing } = await supabase
    .from("exam_requests")
    .select("id")
    .eq("student_profile_id", studentProfileId)
    .eq("group_id", groupId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) return await actionError("pending_request_exists");

  const { error } = await supabase
    .from("exam_requests")
    .insert({
      mosque_id: mosqueId,
      student_profile_id: studentProfileId,
      group_id: groupId,
      requested_by: teacherProfile.id,
      notes,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });

  if (error) return await dbActionErr(error.message, "createExamRequest");

  await writeAuditLog({
    mosqueId, actorUserId: ctx.userId,
    action: "exam_request.created", targetTable: "exam_requests", targetId: null,
    metadata: { group_id: groupId, student_profile_id: studentProfileId },
  });

  revalidatePath(`/[locale]/teacher/groups/${groupId}`, "page");
  return { ok: true };
}

export async function bulkExamRequest(
  groupId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireTeacher();
  if (!(await assertTeacherOfGroup(ctx.teacherProfileId, groupId)))
    return await actionError("not_authorised_for_group");

  const raw = formData.get("student_profile_ids");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!raw) return await actionError("no_students_selected");

  const studentIds = String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (studentIds.length === 0) return await actionError("no_students_selected");

  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("mosque_id")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return await actionError("group_not_found");
  const mosqueId = group.mosque_id;

  const { data: teacherProfile } = await supabase
    .from("teacher_profiles")
    .select("id")
    .eq("profile_id", ctx.userId)
    .eq("mosque_id", mosqueId)
    .eq("is_active", true)
    .maybeSingle();
  if (!teacherProfile) return await actionError("no_teacher_profile_in_mosque");

  const { data: existing } = await supabase
    .from("exam_requests")
    .select("student_profile_id")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .in("student_profile_id", studentIds);

  const alreadyPending = new Set((existing ?? []).map((r) => r.student_profile_id));
  const toInsert = studentIds.filter((id) => !alreadyPending.has(id));

  if (toInsert.length === 0) return await actionError("pending_requests_all_exist");

  const rows = toInsert.map((studentProfileId) => ({
    mosque_id: mosqueId,
    student_profile_id: studentProfileId,
    group_id: groupId,
    requested_by: teacherProfile.id,
    notes,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  }));

  const { error } = await supabase.from("exam_requests").insert(rows);
  if (error) return await dbActionErr(error.message, "bulkExamRequest");

  await writeAuditLog({
    mosqueId, actorUserId: ctx.userId,
    action: "exam_request.created.bulk", targetTable: "exam_requests", targetId: null,
    metadata: { group_id: groupId, count: toInsert.length },
  });

  revalidatePath(`/[locale]/teacher/groups/${groupId}`, "page");
  return { ok: true };
}

export async function cancelExamRequest(
  groupId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireTeacher();
  if (!(await assertTeacherOfGroup(ctx.teacherProfileId, groupId)))
    return await actionError("not_authorised_for_group");

  const requestId = String(formData.get("request_id") ?? "").trim();
  if (!requestId) return await actionError("request_id_required");

  const supabase = await createClient();

  const { error } = await supabase
    .from("exam_requests")
    .update({ status: "cancelled", updated_by: ctx.userId })
    .eq("id", requestId)
    .eq("requested_by", ctx.teacherProfileId)
    .eq("status", "pending");

  if (error) return await dbActionErr(error.message, "cancelExamRequest");

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "exam_request.cancelled", targetTable: "exam_requests", targetId: requestId,
  });

  revalidatePath(`/[locale]/teacher/groups/${groupId}`, "page");
  return { ok: true };
}

export async function upsertHifzProgressTeacher(
  groupId: string,
  studentProfileId: string,
  pagesMemorized: number,
  notes?: string,
): Promise<ActionResult> {
  const ctx = await requireTeacher();
  if (!(await assertTeacherOfGroup(ctx.teacherProfileId, groupId))) {
    return await actionError("not_assigned_to_group");
  }
  if (pagesMemorized < 0 || pagesMemorized > 604) return await actionError("pages_out_of_range");

  const supabase = await createClient();
  const { error } = await supabase
    .from("hifz_progress")
    .upsert(
      {
        mosque_id: ctx.mosqueId,
        group_id: groupId,
        student_profile_id: studentProfileId,
        pages_memorized: pagesMemorized,
        notes: notes ?? null,
        updated_by: ctx.userId,
        created_by: ctx.userId,
      },
      { onConflict: "student_profile_id,group_id" },
    );
  if (error) return await dbActionErr(error.message, "upsertHifzProgressTeacher");
  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "hifz.upserted", targetTable: "hifz_progress", targetId: null,
    metadata: { group_id: groupId, student_profile_id: studentProfileId, pages: pagesMemorized },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
