import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiAdmin,
  createSupabaseForUser,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { writeAuditLog } from "@/lib/audit";
import { parseJson } from "@/app/api/v1/helpers/validate";

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  body: z.string().trim().min(1, "Body is required"),
  audience: z.enum(["mosque", "group"]).default("mosque"),
  group_id: z.string().trim().optional(),
  publish: z.boolean().default(false),
}).refine(
  (d) => d.audience !== "group" || (d.group_id && d.group_id.length > 0),
  { message: "Please select a group", path: ["group_id"] },
);

export async function GET(request: NextRequest) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const supabase = await createSupabaseForUser(request);
  const { data: announcements, error } = await supabase
    .from("announcements")
    .select("id, title, body, audience, group_id, is_published, published_at, created_at")
    .eq("mosque_id", admin.mosqueId)
    .order("created_at", { ascending: false });

  if (error) return dbErr(error.message);
  return ok(announcements);
}

export async function POST(request: NextRequest) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const parsed = await parseJson(request, createSchema);
  if (!parsed.ok) return parsed.response;
  const { title, body: bodyText, audience, group_id: groupId, publish } = parsed.data;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      mosque_id: admin.mosqueId,
      author_profile_id: admin.userId,
      title,
      body: bodyText,
      audience,
      group_id: audience === "group" ? groupId : null,
      is_published: publish,
      published_at: publish ? new Date().toISOString() : null,
      created_by: admin.userId,
      updated_by: admin.userId,
    })
    .select("id")
    .single();

  if (error) return dbErr(error.message);

  await writeAuditLog({
    mosqueId: admin.mosqueId,
    actorUserId: admin.userId,
    action: publish ? "announcement.published" : "announcement.created",
    targetTable: "announcements",
    targetId: data.id,
    metadata: { title },
  });

  return ok(data, 201);
}
