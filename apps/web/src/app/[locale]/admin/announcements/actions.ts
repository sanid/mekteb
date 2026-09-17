"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { dbActionErr, type ActionResult } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";


export async function createAnnouncement(formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audience = String(formData.get("audience") ?? "mosque") as "mosque" | "group";
  const groupId = String(formData.get("group_id") ?? "").trim() || null;
  const publish = formData.get("publish") === "true";

  if (!title || !body) return await actionError("title_and_body_required");
  if (audience === "group" && !groupId) return await actionError("select_group");

  const supabase = await createClient();
  const { data, error } = await supabase.from("announcements").insert({
    mosque_id: ctx.mosqueId,
    author_profile_id: ctx.userId,
    title,
    body,
    audience,
    group_id: audience === "group" ? groupId : null,
    is_published: publish,
    published_at: publish ? new Date().toISOString() : null,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  }).select("id").single();

  if (error) return await dbActionErr(error.message, "createAnnouncement");

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: publish ? "announcement.published" : "announcement.created",
    targetTable: "announcements", targetId: data?.id ?? "",
    metadata: { title },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function publishAnnouncement(announcementId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("announcements")
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
      updated_by: ctx.userId,
    })
    .eq("id", announcementId)
    .eq("mosque_id", ctx.mosqueId);

  if (error) return await dbActionErr(error.message, "publishAnnouncement");

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "announcement.published", targetTable: "announcements", targetId: announcementId,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteAnnouncement(announcementId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId)
    .eq("mosque_id", ctx.mosqueId);

  if (error) return await dbActionErr(error.message, "deleteAnnouncement");

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "announcement.deleted", targetTable: "announcements", targetId: announcementId,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
