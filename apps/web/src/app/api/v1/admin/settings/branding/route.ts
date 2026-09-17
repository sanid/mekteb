import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiAdmin,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { writeAuditLog } from "@/lib/audit";
import { parseJson } from "@/app/api/v1/helpers/validate";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const brandingSchema = z.object({
  primary_color: z.string().regex(HEX_COLOR, "Must be a hex color like #1A2B3C").optional().nullable(),
  secondary_color: z.string().regex(HEX_COLOR, "Must be a hex color like #1A2B3C").optional().nullable(),
});

export async function PUT(request: NextRequest) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const parsed = await parseJson(request, brandingSchema);
  if (!parsed.ok) return parsed.response;
  const { primary_color: primaryColor, secondary_color: secondaryColor } = parsed.data;

  const supabase = await createSupabaseForUser(request);
  const { error } = await supabase
    .from("mosque_branding")
    .upsert(
      {
        mosque_id: admin.mosqueId,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "mosque_id" },
    );

  if (error) return dbErr(error.message);

  await writeAuditLog({
    mosqueId: admin.mosqueId,
    actorUserId: admin.userId,
    action: "settings.branding_saved",
    targetTable: "mosque_branding",
    targetId: admin.mosqueId,
    metadata: { primary_color: primaryColor ?? null, secondary_color: secondaryColor ?? null },
  });

  return ok(null);
}
