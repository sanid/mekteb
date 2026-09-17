import { NextRequest } from "next/server";

import {
  requireApiAdmin,
  createSupabaseForUser,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { writeAuditLog } from "@/lib/audit";

const LOGO_BUCKET = "mosque-logos";
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const EXT_FOR_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function POST(request: NextRequest) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const formData = await request.formData();
  const file = formData.get("logo") as File | null;

  if (!file || file.size === 0) return err("No file selected");
  if (file.size > 2 * 1024 * 1024) return err("Logo must be under 2 MB");

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return err("Unsupported file type. Allowed: PNG, JPEG, WebP.");
  }

  const ext = EXT_FOR_MIME[file.type] ?? "png";
  const path = `${admin.mosqueId}/logo.${ext}`;

  const adminClient = createSupabaseAdmin();
  const { error: uploadErr } = await adminClient.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadErr) return dbErr(uploadErr.message);

  const { data: urlData } = adminClient.storage
    .from(LOGO_BUCKET)
    .getPublicUrl(path);
  const logo_url = urlData.publicUrl;

  const supabase = await createSupabaseForUser(request);
  const { error } = await supabase
    .from("mosque_branding")
    .upsert(
      {
        mosque_id: admin.mosqueId,
        logo_url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "mosque_id" },
    );

  if (error) return dbErr(error.message);

  await writeAuditLog({
    mosqueId: admin.mosqueId,
    actorUserId: admin.userId,
    action: "settings.logo_uploaded",
    targetTable: "mosque_branding",
    targetId: admin.mosqueId,
  });

  return ok({ logo_url });
}
