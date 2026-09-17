"use server";

import { revalidatePath } from "next/cache";

import { requireTeacher } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { dbActionErr, type ActionResult } from "@/lib/action-result";
import { actionError, type ErrorCode } from "@/lib/action-errors";

/**
 * Announcement lifecycle for teachers: create (published or draft), update,
 * delete. Every mutation guards on the author + mosque the way create always
 * has — a teacher can only ever touch announcements they wrote themselves.
 *
 * Drafts are how "I'll finish this later" stays on the server instead of
 * landing in every inbox: `is_published` is already on the row, the UI now
 * exposes it as a second submit button (see §3.3 in open.md).
 */

type AnnouncementInput = {
  title: string;
  body: string;
  audience: "mosque" | "group";
  groupId: string | null;
  isPublished: boolean;
};

function parseInput(formData: FormData): AnnouncementInput | { error: ErrorCode } {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audience = String(formData.get("audience") ?? "mosque") as
    | "mosque"
    | "group";
  const groupId = String(formData.get("group_id") ?? "").trim() || null;

  if (!title || !body) return { error: "title_and_body_required" };
  if (audience === "group" && !groupId) return { error: "select_group" };
  return { title, body, audience, groupId, isPublished: formData.get("publish") === "true" };
}

export async function createAnnouncement(formData: FormData): Promise<ActionResult> {
  const ctx = await requireTeacher();
  const input = parseInput(formData);
  if ("error" in input) return await actionError(input.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      mosque_id: ctx.mosqueId,
      author_profile_id: ctx.userId,
      title: input.title,
      body: input.body,
      audience: input.audience,
      group_id: input.audience === "group" ? input.groupId : null,
      is_published: input.isPublished,
      published_at: input.isPublished ? new Date().toISOString() : null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error) return await dbActionErr(error.message, "createAnnouncement");

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: input.isPublished ? "announcement.published" : "announcement.created",
    targetTable: "announcements",
    targetId: data?.id ?? "",
    metadata: { title: input.title },
  });

  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function updateAnnouncement(formData: FormData): Promise<ActionResult> {
  const ctx = await requireTeacher();
  const announcementId = String(formData.get("announcement_id") ?? "").trim();
  if (!announcementId) return await actionError("announcement_not_found");

  const input = parseInput(formData);
  if ("error" in input) return await actionError(input.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({
      title: input.title,
      body: input.body,
      audience: input.audience,
      group_id: input.audience === "group" ? input.groupId : null,
      updated_by: ctx.userId,
    })
    .eq("id", announcementId)
    .eq("author_profile_id", ctx.userId)
    .eq("mosque_id", ctx.mosqueId);

  if (error) return await dbActionErr(error.message, "updateAnnouncement");

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "announcement.updated",
    targetTable: "announcements",
    targetId: announcementId,
    metadata: { title: input.title },
  });

  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Publish a draft (or re-publish an existing one) without touching its body. */
export async function publishAnnouncement(announcementId: string): Promise<ActionResult> {
  const ctx = await requireTeacher();
  const supabase = await createClient();

  const { error } = await supabase
    .from("announcements")
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
      updated_by: ctx.userId,
    })
    .eq("id", announcementId)
    .eq("author_profile_id", ctx.userId)
    .eq("mosque_id", ctx.mosqueId);

  if (error) return await dbActionErr(error.message, "publishAnnouncement");

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "announcement.published",
    targetTable: "announcements",
    targetId: announcementId,
  });

  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteAnnouncement(announcementId: string): Promise<ActionResult> {
  const ctx = await requireTeacher();
  const supabase = await createClient();

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId)
    .eq("author_profile_id", ctx.userId)
    .eq("mosque_id", ctx.mosqueId);

  if (error) return await dbActionErr(error.message, "deleteAnnouncement");

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "announcement.deleted",
    targetTable: "announcements",
    targetId: announcementId,
  });

  revalidatePath("/", "layout");
  return { ok: true as const };
}
