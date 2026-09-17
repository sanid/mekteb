"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DiplomaElement } from "@/lib/diploma-types";
import { dbActionErr, type ActionResult } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";
import { IMAGE_MIME_TYPES, EXT_FOR_IMAGE_MIME } from "@/lib/upload-allowlists";


const ASSET_BUCKET = "diploma-assets";

export async function saveDiplomaTemplate(
  id: string | null,
  payload: {
    name: string;
    orientation: string;
    background_image_url: string | null;
    elements: DiplomaElement[];
  }
): Promise<ActionResult<string | null>> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const data = {
    mosque_id: ctx.mosqueId,
    name: payload.name,
    orientation: payload.orientation,
    background_image_url: payload.background_image_url,
    elements: payload.elements,
    updated_at: new Date().toISOString()
  };

  let error;
  let templateId = id;

  if (id) {
    const res = await supabase
      .from("diploma_templates")
      .update(data)
      .eq("id", id)
      .eq("mosque_id", ctx.mosqueId);
    error = res.error;
  } else {
    const res = await supabase
      .from("diploma_templates")
      .insert({ ...data, is_active: false })
      .select("id")
      .single();
    error = res.error;
    if (res.data) {
      templateId = res.data.id;
    }
  }

  if (error) return await dbActionErr(error.message, "saveDiplomaTemplate");

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: id ? "settings.diploma_template_updated" : "settings.diploma_template_created",
    targetTable: "diploma_templates",
    targetId: templateId || "",
    metadata: { name: payload.name }
  });

  revalidatePath("/[locale]/admin/settings/diplomas", "layout");
  return { ok: true, data: templateId };
}

export async function deleteDiplomaTemplate(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("diploma_templates")
    .delete()
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId);

  if (error) return await dbActionErr(error.message, "deleteDiplomaTemplate");

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "settings.diploma_template_deleted",
    targetTable: "diploma_templates",
    targetId: id
  });

  revalidatePath("/[locale]/admin/settings/diplomas", "layout");
  return { ok: true };
}

export async function toggleTemplateActive(id: string, active: boolean): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  if (active) {
    // Turn off all other active templates for this mosque first
    const { error: deactivateError } = await supabase
      .from("diploma_templates")
      .update({ is_active: false })
      .eq("mosque_id", ctx.mosqueId);

    if (deactivateError) return await dbActionErr(deactivateError.message, "toggleTemplateActive");
  }

  const { error } = await supabase
    .from("diploma_templates")
    .update({ is_active: active })
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId);

  if (error) return await dbActionErr(error.message, "toggleTemplateActive");

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "settings.diploma_template_toggled",
    targetTable: "diploma_templates",
    targetId: id,
    metadata: { active }
  });

  revalidatePath("/[locale]/admin/settings/diplomas", "layout");
  return { ok: true };
}

const STANDARD_TEMPLATES = [
  { system_key: "fancy",   name: "Ornate",     orientation: "portrait" },
  { system_key: "clean",   name: "Clean",      orientation: "portrait" },
  { system_key: "islamic", name: "Islamic",    orientation: "portrait" },
] as const;

// Called directly from the server component — not a form action, so no "use server" boundary needed.
// Kept in this file for co-location but does NOT call revalidatePath (caller re-fetches).
export async function seedStandardTemplates(): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("diploma_templates")
    .select("system_key")
    .eq("mosque_id", ctx.mosqueId)
    .not("system_key", "is", null);

  const existingKeys = new Set((existing ?? []).map((r) => r.system_key));

  const toInsert = STANDARD_TEMPLATES.filter((t) => !existingKeys.has(t.system_key)).map((t) => ({
    mosque_id: ctx.mosqueId,
    system_key: t.system_key,
    name: t.name,
    orientation: t.orientation,
    is_active: false,
    elements: [],
  }));

  if (toInsert.length === 0) return { ok: true };

  const { error } = await supabase
    .from("diploma_templates")
    .upsert(toInsert as never, { onConflict: "mosque_id,system_key", ignoreDuplicates: true });
  if (error) return await dbActionErr(error.message, "seedStandardTemplates");

  return { ok: true };
}


export async function uploadDiplomaAsset(formData: FormData): Promise<ActionResult<string>> {
  const ctx = await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return await actionError("no_file_selected");
  if (file.size > 5 * 1024 * 1024) return await actionError("file_too_large_5mb");

  // The bucket is public: an SVG here is a stored-XSS vector (embedded
  // <script> runs in any browser rendering the template). Raster only.
  if (!IMAGE_MIME_TYPES.has(file.type)) return await actionError("invalid_file_type");

  const ext = EXT_FOR_IMAGE_MIME[file.type] ?? "png";
  const nameClean = file.name.replace(/[^\w.-]+/g, "_");
  const path = `${ctx.mosqueId}/${Date.now()}_${nameClean}`;

  const admin = createAdminClient();
  const { error: uploadErr } = await admin.storage
    .from(ASSET_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadErr) return await dbActionErr(uploadErr.message, "uploadDiplomaAsset");

  const { data: urlData } = admin.storage.from(ASSET_BUCKET).getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "settings.diploma_asset_uploaded",
    targetTable: "storage.objects",
    targetId: path,
    metadata: { url: publicUrl }
  });

  return { ok: true, data: publicUrl };
}
