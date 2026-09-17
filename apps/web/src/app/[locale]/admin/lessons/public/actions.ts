"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { actionErr, dbActionErr, type ActionResult } from "@/lib/action-result";
import { getTranslations } from "next-intl/server";
import { LIBRARY_FONTS, LIBRARY_THEMES, type LibraryFont, type LibraryTheme } from "@/lib/public-library-config";

export async function savePublicLibrary(formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();

  const accent = String(formData.get("accent_color") ?? "").trim();
  const useAccent = formData.has("use_accent") && /^#[0-9a-fA-F]{6}$/.test(accent);
  const font = String(formData.get("font_style") ?? "sans") as LibraryFont;
  const theme = String(formData.get("theme") ?? "system") as LibraryTheme;

  const t = await getTranslations("Admin");
  const subdomain = String(formData.get("subdomain") ?? "").trim().toLowerCase() || null;
  if (subdomain && !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(subdomain)) {
    return actionErr(t("publicLibrarySubdomainInvalid"));
  }

  const row = {
    mosque_id: ctx.mosqueId,
    is_enabled: formData.has("is_enabled"),
    title: String(formData.get("title") ?? "").trim().slice(0, 120) || null,
    intro: String(formData.get("intro") ?? "").trim().slice(0, 2000) || null,
    accent_color: useAccent ? accent : null,
    font_style: LIBRARY_FONTS.includes(font) ? font : "sans",
    theme: LIBRARY_THEMES.includes(theme) ? theme : "system",
    show_logo: formData.has("show_logo"),
    subdomain,
    base_locale: ["de", "en", "bs", "tr"].includes(String(formData.get("base_locale")))
      ? String(formData.get("base_locale"))
      : null,
    updated_by: ctx.userId,
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("public_library_settings")
    .upsert(row, { onConflict: "mosque_id" });
  if (error) {
    // Unique violation or the reserved-name check: the subdomain is not available.
    if (subdomain && (error.code === "23505" || error.code === "23514")) {
      return actionErr(t("publicLibrarySubdomainTaken"));
    }
    return await dbActionErr(error.message, "savePublicLibrary");
  }

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "settings.public_library_saved",
    targetTable: "public_library_settings",
    targetId: ctx.mosqueId,
    metadata: { is_enabled: row.is_enabled },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
