"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbActionErr, type ActionResult } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";
import { IMAGE_MIME_TYPES, EXT_FOR_IMAGE_MIME } from "@/lib/upload-allowlists";


const LOGO_BUCKET = "mosque-logos";

export async function savePrayerSettings(formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();

  const location = String(formData.get("prayer_location") ?? "").trim();
  const method = String(formData.get("prayer_method") ?? "MWL").trim() || "MWL";

  if (!location) return await actionError("location_required");

  const supabase = await createClient();
  const { error } = await supabase
    .from("mosques")
    .update({
      prayer_location: location,
      prayer_method: method,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.mosqueId);

  if (error) return await dbActionErr(error.message, "savePrayerSettings");

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "settings.prayer_saved",
    targetTable: "mosques",
    targetId: ctx.mosqueId,
    metadata: { location, method },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveBranding(formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const primary_color = String(formData.get("primary_color") ?? "").trim() || null;
  const secondary_color = String(formData.get("secondary_color") ?? "").trim() || null;

  // Two forms post here: the colour form and the logo-options form. Only the
  // latter carries the logo fields, so leave them alone when they are absent
  // (an unchecked checkbox is absent too, hence the logo_width marker).
  const hasLogoOptions = formData.has("logo_width");
  const logoOptions = hasLogoOptions
    ? {
        logo_width: parseInt(String(formData.get("logo_width")), 10) || 6,
        show_text_logo: formData.has("show_text_logo"),
      }
    : {};

  const supabase = await createClient();
  const { error } = await supabase
    .from("mosque_branding")
    .upsert(
      { mosque_id: ctx.mosqueId, primary_color, secondary_color, ...logoOptions, updated_at: new Date().toISOString() },
      { onConflict: "mosque_id" },
    );

  if (error) return await dbActionErr(error.message, "saveBranding");
  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "settings.branding_saved", targetTable: "mosque_branding", targetId: ctx.mosqueId,
    metadata: { primary_color, secondary_color },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function uploadLogo(formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) return await actionError("no_file_selected");
  if (file.size > 2 * 1024 * 1024) return await actionError("logo_too_large_2mb");

  // Mirrors the API route (`/api/v1/admin/settings/logo`): raster images only.
  // An SVG logo would sit in a public bucket and run its embedded <script> in
  // any browser that renders the mosque's branding.
  if (!IMAGE_MIME_TYPES.has(file.type)) return await actionError("invalid_file_type");

  const ext = EXT_FOR_IMAGE_MIME[file.type] ?? "png";
  const path = `${ctx.mosqueId}/logo.${ext}`;

  const admin = createAdminClient();
  const { error: uploadErr } = await admin.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadErr) return await dbActionErr(uploadErr.message, "uploadLogo");

  const { data: urlData } = admin.storage.from(LOGO_BUCKET).getPublicUrl(path);
  const logo_url = urlData.publicUrl;

  const supabase = await createClient();
  const { error } = await supabase
    .from("mosque_branding")
    .upsert(
      { mosque_id: ctx.mosqueId, logo_url, updated_at: new Date().toISOString() },
      { onConflict: "mosque_id" },
    );

  if (error) return await dbActionErr(error.message, "uploadLogo");
  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "settings.logo_uploaded", targetTable: "mosque_branding", targetId: ctx.mosqueId,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveMosqueInfo(formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim() || null;
  const locale = String(formData.get("locale") ?? "").trim() || null;
  const school_year_start = String(formData.get("school_year_start") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim() || null;
  if (!name) return await actionError("name_required");

  const supabase = await createClient();
  const { error } = await supabase
    .from("mosques")
    .update({
      name,
      ...(timezone ? { timezone } : {}),
      ...(locale ? { locale } : {}),
      ...(school_year_start ? { school_year_start } : {}),
      ...(state ? { state } : {}),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", ctx.mosqueId);

  if (error) return await dbActionErr(error.message, "saveMosqueInfo");
  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "settings.mosque_info_saved", targetTable: "mosques", targetId: ctx.mosqueId,
    metadata: { name },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveCustomisation(formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const app_name        = String(formData.get("app_name")        ?? "").trim() || null;
  const welcome_message = String(formData.get("welcome_message") ?? "").trim() || null;
  const contact_address = String(formData.get("contact_address") ?? "").trim() || null;
  const contact_phone   = String(formData.get("contact_phone")   ?? "").trim() || null;
  const contact_email   = String(formData.get("contact_email")   ?? "").trim() || null;
  const contact_website = String(formData.get("contact_website") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("mosque_branding")
    .upsert(
      { mosque_id: ctx.mosqueId, app_name, welcome_message, contact_address, contact_phone, contact_email, contact_website, updated_at: new Date().toISOString() },
      { onConflict: "mosque_id" },
    );

  if (error) return await dbActionErr(error.message, "saveCustomisation");
  revalidatePath("/", "layout");
  return { ok: true };
}

// Keep old export name for any callers that imported it directly
export { saveMosqueInfo as saveMosqueName };

export async function deleteOwnMosque(confirmation: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  // Verify the confirmed name matches
  const { data: mosque } = await supabase
    .from("mosques")
    .select("id, name, slug, locale")
    .eq("id", ctx.mosqueId)
    .single();

  if (!mosque) return await actionError("mosque_not_found");
  if (confirmation !== mosque.name) return await actionError("name_mismatch");

  const admin = createAdminClient();
  let stripeCustomerDeleted = false;
  let storageFilesDeleted = 0;

  // 1. Write GDPR deletion log entry (before deletion so we can capture the state)
  const { data: logEntry } = await admin
    .from("gdpr_deletion_log")
    .insert({
      mosque_id: ctx.mosqueId,
      mosque_name: mosque.name,
      mosque_slug: mosque.slug,
      requested_by_email: ctx.email,
    })
    .select("id")
    .single();

  // 2. Cancel + delete Stripe customer (removes all payment data from Stripe)
  try {
    const { data: sub } = await admin
      .from("mosque_subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("mosque_id", ctx.mosqueId)
      .maybeSingle();

    if (sub) {
      const { stripe } = await import("@/lib/stripe");
      if (sub.stripe_subscription_id) {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      }
      if (sub.stripe_customer_id) {
        await stripe.customers.del(sub.stripe_customer_id);
        stripeCustomerDeleted = true;
      }
    }
  } catch {
    // Non-fatal — log and continue
  }

  // 3. Delete all Storage objects for this mosque across every bucket
  const BUCKETS = ["mosque-logos", "lesson-resources", "lesson-images", "homework-attachments"];
  for (const bucket of BUCKETS) {
    try {
      const { data: files } = await admin.storage
        .from(bucket)
        .list(ctx.mosqueId, { limit: 1000 });
      if (files && files.length > 0) {
        const paths = files.map((f) => `${ctx.mosqueId}/${f.name}`);
        await admin.storage.from(bucket).remove(paths);
        storageFilesDeleted += files.length;
      }
    } catch {
      // Non-fatal
    }
  }

  // 4. Delete all auth users exclusive to this mosque
  const { data: memberships } = await admin
    .from("memberships")
    .select("user_id")
    .eq("mosque_id", ctx.mosqueId);

  const userIds = [...new Set((memberships ?? []).map((m) => m.user_id))];
  for (const userId of userIds) {
    const { count } = await admin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("mosque_id", ctx.mosqueId);
    if (count === 0) {
      await admin.auth.admin.deleteUser(userId);
    }
  }

  // 5. Delete the mosque — FK cascades wipe all business data
  await admin.from("mosques").delete().eq("id", ctx.mosqueId);

  const deletedAt = new Date();

  // 6. Mark GDPR log complete
  if (logEntry?.id) {
    await admin
      .from("gdpr_deletion_log")
      .update({
        deletion_completed_at: deletedAt.toISOString(),
        stripe_customer_deleted: stripeCustomerDeleted,
        storage_files_deleted: storageFilesDeleted,
      })
      .eq("id", logEntry.id);
  }

  // 7. Send GDPR deletion confirmation email (before auth user is removed)
  try {
    const { sendGdprDeletionConfirmation } = await import("@/lib/email");
    await sendGdprDeletionConfirmation({
      to: ctx.email,
      mosqueName: mosque.name,
      mosqueSlug: mosque.slug,
      locale: mosque.locale ?? "en",
      deletedAt,
      storageFilesDeleted,
      stripeCustomerDeleted,
    });
  } catch {
    // Non-fatal — deletion already complete
  }

  // 8. Sign out and redirect
  await supabase.auth.signOut();

  const { redirect } = await import("next/navigation");
  const { getLocale } = await import("next-intl/server");
  const locale = await getLocale();
  redirect(`/${locale}/login`);
  return { ok: true }; // unreachable
}
