"use server";

import { revalidatePath } from "next/cache";

import { requireMember, primaryRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/components/ActionForm";
import { dbActionErr } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";

export type CreateThreadResult =
  | { ok: true; threadId: string }
  | { error: string };

/** Creates a thread, adds participants, and posts the first message. */
export async function createThread(
  _prev: CreateThreadResult | null,
  formData: FormData,
): Promise<CreateThreadResult> {
  const ctx = await requireMember();
  const supabase = await createClient();

  const subject = String(formData.get("subject") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim();
  const recipientIds = formData.getAll("recipient_ids").map(String).filter(Boolean);

  if (!body) return await actionError("message_empty");
  if (recipientIds.length === 0) return await actionError("select_at_least_one_recipient");

  const { data: validMembers } = await supabase
    .from("memberships")
    .select("user_id")
    .in("user_id", recipientIds)
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_active", true);
  const validMemberIds = new Set((validMembers ?? []).map((m) => m.user_id));
  const unchecked = recipientIds.filter((id) => !validMemberIds.has(id));
  if (unchecked.length > 0) {
    const { data: validStudents } = await supabase
      .from("student_profiles")
      .select("profile_id")
      .in("profile_id", unchecked)
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_active", true);
    for (const s of validStudents ?? []) validMemberIds.add(s.profile_id!);
  }
  const safeRecipients = recipientIds.filter((id) => validMemberIds.has(id));
  if (safeRecipients.length === 0) return await actionError("recipients_not_in_mosque");

  // Create thread
  const { data: thread, error: tErr } = await supabase
    .from("message_threads")
    .insert({
      mosque_id: ctx.mosqueId,
      subject,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id")
    .single();
  if (tErr || !thread) return { error: tErr?.message ?? "Could not create thread" };

  // Add all participants (creator + recipients)
  const allParticipants = Array.from(new Set([ctx.userId, ...safeRecipients]));
  const { error: pErr } = await supabase.from("message_participants").insert(
    allParticipants.map((profileId) => ({
      mosque_id: ctx.mosqueId,
      thread_id: thread.id,
      profile_id: profileId,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })),
  );
  if (pErr) return await dbActionErr(pErr.message, "createThread");

  // Post the first message
  const { error: mErr } = await supabase.from("messages").insert({
    mosque_id: ctx.mosqueId,
    thread_id: thread.id,
    author_profile_id: ctx.userId,
    body,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (mErr) return await dbActionErr(mErr.message, "createThread");

  const role = await primaryRole(ctx.userId);
  void role;

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "message.thread_created", targetTable: "message_threads", targetId: thread.id,
  });

  return { ok: true, threadId: thread.id };
}

/** Finds an existing 1-on-1 thread with a recipient, or creates a new empty one. */
export async function findOrCreateThread(
  recipientId: string,
): Promise<{ threadId: string } | { error: string }> {
  const ctx = await requireMember();
  const supabase = await createClient();

  const { data: recipientMembership } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("user_id", recipientId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_active", true)
    .limit(1);
  if (!recipientMembership?.length) {
    const { data: studentProfile } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("profile_id", recipientId)
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_active", true)
      .maybeSingle();
    if (!studentProfile) return await actionError("recipient_not_in_mosque");
  }

  // Find threads I participate in
  const { data: myParticipations } = await supabase
    .from("message_participants")
    .select("thread_id")
    .eq("profile_id", ctx.userId);

  const myThreadIds = (myParticipations ?? []).map((p) => p.thread_id);

  if (myThreadIds.length > 0) {
    // Find threads where recipient is also a participant
    const { data: sharedParticipations } = await supabase
      .from("message_participants")
      .select("thread_id")
      .eq("profile_id", recipientId)
      .in("thread_id", myThreadIds);

    const sharedIds = (sharedParticipations ?? []).map((p) => p.thread_id);

    for (const threadId of sharedIds) {
      const { count } = await supabase
        .from("message_participants")
        .select("*", { count: "exact", head: true })
        .eq("thread_id", threadId);
      if (count === 2) return { threadId };
    }
  }

  // No existing 1:1 thread — create an empty one
  const { data: thread, error: tErr } = await supabase
    .from("message_threads")
    .insert({
      mosque_id: ctx.mosqueId,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id")
    .single();
  if (tErr || !thread) return { error: tErr?.message ?? "Could not create thread" };

  const { error: pErr } = await supabase.from("message_participants").insert([
    {
      mosque_id: ctx.mosqueId,
      thread_id: thread.id,
      profile_id: ctx.userId,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    },
    {
      mosque_id: ctx.mosqueId,
      thread_id: thread.id,
      profile_id: recipientId,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    },
  ]);
  if (pErr) return await dbActionErr(pErr.message, "findOrCreateThread");

  revalidatePath("/[locale]/admin/messages", "layout");
  revalidatePath("/[locale]/teacher/messages", "layout");
  revalidatePath("/[locale]/parent/messages", "layout");
  revalidatePath("/[locale]/examiner/messages", "layout");

  return { threadId: thread.id };
}

/** Sends a reply message in an existing thread. */
export async function sendMessage(
  threadId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireMember();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return await actionError("message_empty");

  const supabase = await createClient();

  const { data: participant } = await supabase
    .from("message_participants")
    .select("id")
    .eq("thread_id", threadId)
    .eq("profile_id", ctx.userId)
    .maybeSingle();
  if (!participant) return await actionError("not_a_thread_participant");

  const { error } = await supabase.from("messages").insert({
    mosque_id: ctx.mosqueId,
    thread_id: threadId,
    author_profile_id: ctx.userId,
    body,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (error) return await dbActionErr(error.message, "sendMessage");

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "message.sent", targetTable: "messages", targetId: threadId,
  });

  // Revalidate layout so thread list previews update too
  revalidatePath("/[locale]/admin/messages", "layout");
  revalidatePath("/[locale]/teacher/messages", "layout");
  revalidatePath("/[locale]/parent/messages", "layout");
  revalidatePath("/[locale]/examiner/messages", "layout");

  return { ok: true };
}

/** Marks the thread as read for the current user. */
export async function markThreadRead(threadId: string): Promise<void> {
  const ctx = await requireMember();
  const supabase = await createClient();
  await supabase
    .from("message_participants")
    .update({ last_read_at: new Date().toISOString(), updated_by: ctx.userId })
    .eq("thread_id", threadId)
    .eq("profile_id", ctx.userId);
}
