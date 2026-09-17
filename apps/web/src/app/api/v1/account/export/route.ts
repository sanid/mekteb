import { NextRequest } from "next/server";

import {
  extractUser,
  createSupabaseAdmin,
  resolveApiRole,
} from "@/app/api/v1/helpers/api-auth";
import {
  okNoStore,
  err,
  unauthorized,
  tooMany,
} from "@/app/api/v1/helpers/response";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildUserExport } from "@/lib/gdpr-export";
import { renderUserExportHtml } from "@/lib/gdpr-export-html";
import { resend, EMAIL_FROM } from "@/lib/email";
import { GdprExportEmail } from "@/emails/gdpr-export-email";
import { writeAuditLog } from "@/lib/audit";

/**
 * Generate a full data export for the authenticated user and email it to
 * them as a JSON attachment. The actual gathering/sending happens inline:
 * the export for a single user is small enough that we don't need a queue.
 */
export async function POST(request: NextRequest) {
  const user = await extractUser(request);
  if (!user) return unauthorized();

  const limit = await checkRateLimit({
    bucket: "gdpr-export",
    key: user.userId,
    windowMs: 24 * 60 * 60 * 1000,
    maxRequests: 3,
  });
  if (!limit.allowed) {
    return tooMany(
      "You can request at most 3 exports per day. Please try again later.",
      limit.retryAfterMs,
    );
  }

  const admin = createSupabaseAdmin();

  // Resolve mosque (best-effort) for audit + the email's mosque name.
  const role = await resolveApiRole(user.userId, request);
  let mosqueId: string | null = null;
  let mosqueName = "Mekteb";
  if (role === "student") {
    const { data } = await admin
      .from("student_profiles")
      .select("mosque_id, mosques(name)")
      .eq("profile_id", user.userId)
      .eq("is_active", true)
      .maybeSingle();
    mosqueId = data?.mosque_id ?? null;
    mosqueName =
      (data?.mosques as { name: string } | null)?.name ?? mosqueName;
  } else {
    const { data } = await admin
      .from("memberships")
      .select("mosque_id, mosques(name)")
      .eq("user_id", user.userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    mosqueId = data?.mosque_id ?? null;
    mosqueName =
      (data?.mosques as { name: string } | null)?.name ?? mosqueName;
  }

  if (!mosqueId) {
    return err(
      "You must belong to a mosque to request a data export.",
      400,
      "no_mosque",
    );
  }

  // Create the tracking row up-front so it's visible to the user.
  const { data: reqRow, error: reqErr } = await admin
    .from("gdpr_requests")
    .insert({
      mosque_id: mosqueId,
      user_id: user.userId,
      email: user.email,
      type: "export",
      status: "processing",
      created_by: user.userId,
      updated_by: user.userId,
    })
    .select("id")
    .single();
  if (reqErr || !reqRow) return err("Could not create export request");

  try {
    const payload = await buildUserExport(user.userId);
    const html = renderUserExportHtml(payload);
    const attachment = Buffer.from(html, "utf8").toString("base64");

    const { error: sendErr } = await resend.emails.send({
      from: EMAIL_FROM,
      to: user.email,
      subject: "Ihr Mekteb-Datenexport",
      react: GdprExportEmail({ mosqueName }),
      attachments: [
        {
          filename: "mekteb-export.html",
          content: attachment,
          contentType: "text/html",
        },
      ],
    });
    if (sendErr) throw new Error(sendErr.message);

    await admin
      .from("gdpr_requests")
      .update({
        status: "sent",
        processed_at: new Date().toISOString(),
        updated_by: user.userId,
      })
      .eq("id", reqRow.id);

    await writeAuditLog({
      mosqueId,
      actorUserId: user.userId,
      action: "gdpr.export_sent",
      targetTable: "gdpr_requests",
      targetId: reqRow.id,
    });

    return okNoStore({ requested: true, requestId: reqRow.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    await admin
      .from("gdpr_requests")
      .update({
        status: "failed",
        metadata: { error: message },
        processed_at: new Date().toISOString(),
        updated_by: user.userId,
      })
      .eq("id", reqRow.id);
    return err("Failed to generate export. Please try again.", 500);
  }
}
