import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiAdmin,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { writeAuditLog } from "@/lib/audit";
import { parseJson } from "@/app/api/v1/helpers/validate";

const infoSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  timezone: z.string().trim().optional(),
  locale: z.string().trim().optional(),
});

export async function PUT(request: NextRequest) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const parsed = await parseJson(request, infoSchema);
  if (!parsed.ok) return parsed.response;
  const { name, timezone, locale } = parsed.data;

  const supabase = await createSupabaseForUser(request);
  const { error } = await supabase
    .from("mosques")
    .update({
      name,
      ...(timezone ? { timezone } : {}),
      ...(locale ? { locale } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", admin.mosqueId);

  if (error) return dbErr(error.message);

  await writeAuditLog({
    mosqueId: admin.mosqueId,
    actorUserId: admin.userId,
    action: "settings.mosque_info_saved",
    targetTable: "mosques",
    targetId: admin.mosqueId,
    metadata: { name },
  });

  return ok(null);
}
