import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiAdmin,
  createSupabaseForUser,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { generateTempPassword, otpExpiresAt } from "@/lib/onboarding";
import { writeAuditLog } from "@/lib/audit";
import { parseJson } from "@/app/api/v1/helpers/validate";

const createParentSchema = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  full_name: z.string().trim().min(1, "Full name is required"),
  phone: z.string().trim().optional().nullable(),
  relation: z.string().trim().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const [
    { data: parents, error: parentsErr },
    { data: links, error: linksErr },
  ] = await Promise.all([
    supabase
      .from("parent_profiles")
      .select("id, relation, is_active, profiles(full_name, display_name)")
      .eq("mosque_id", ctx.mosqueId),
    supabase
      .from("parent_student_links")
      .select("id, parent_profile_id, student_profiles(full_name)")
      .eq("mosque_id", ctx.mosqueId),
  ]);

  if (parentsErr) return dbErr(parentsErr.message);
  if (linksErr) return dbErr(linksErr.message);

  const studentsByParent = new Map<string, string[]>();
  for (const l of links ?? []) {
    const name = (l.student_profiles as { full_name: string } | null)
      ?.full_name;
    if (!name) continue;
    const list = studentsByParent.get(l.parent_profile_id) ?? [];
    list.push(name);
    studentsByParent.set(l.parent_profile_id, list);
  }

  const url = request.nextUrl;
  const q = url.searchParams.get("q");
  const filtered = q
    ? (parents ?? []).filter((p) => {
        const profile = p.profiles as {
          full_name: string | null;
          display_name: string | null;
        } | null;
        const name = (
          profile?.display_name ?? profile?.full_name ?? ""
        ).toLowerCase();
        return name.includes(q.toLowerCase());
      })
    : parents ?? [];

  const result = (filtered ?? []).map((p) => ({
    ...p,
    children: studentsByParent.get(p.id) ?? [],
  }));

  return ok(result);
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const parsed = await parseJson(request, createParentSchema);
  if (!parsed.ok) return parsed.response;
  const { email, full_name, phone, relation } = parsed.data;

  const admin = createSupabaseAdmin();
  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name, display_name: full_name },
    });
  if (createErr || !created.user) {
    return dbErr(createErr?.message);
  }
  const newUserId = created.user.id;

  await admin
    .from("profiles")
    .update({
      must_rotate_password: true,
      phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", newUserId);

  const { error: membershipErr } = await admin
    .from("memberships")
    .insert({
      user_id: newUserId,
      mosque_id: ctx.mosqueId,
      role: "parent",
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
  if (membershipErr) {
    await admin.auth.admin.deleteUser(newUserId);
    return dbErr(membershipErr.message);
  }

  const { error: parentErr } = await admin
    .from("parent_profiles")
    .insert({
      mosque_id: ctx.mosqueId,
      profile_id: newUserId,
      relation,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
  if (parentErr) {
    await admin.auth.admin.deleteUser(newUserId);
    return dbErr(parentErr.message);
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

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "parent.account_created",
    targetTable: "parent_profiles",
    targetId: newUserId,
    metadata: { email },
  });

  return ok({ email, full_name, tempPassword, expires_at }, 201);
}
