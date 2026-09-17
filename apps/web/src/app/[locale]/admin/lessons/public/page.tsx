import { getTranslations } from "next-intl/server";
import { Globe } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import type { LibraryFont, LibraryTheme } from "@/lib/public-library-config";

import { PublicLibraryForm } from "./PublicLibraryForm";

export default async function PublicLibrarySettingsPage() {
  const ctx = await requireAdmin();
  await requirePlugin(ctx.mosqueId, "lesson_library", "/admin");
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const [{ data: mosque }, { data: settings }, { data: branding }] = await Promise.all([
    supabase.from("mosques").select("name, slug, locale").eq("id", ctx.mosqueId).single(),
    supabase.from("public_library_settings").select("*").eq("mosque_id", ctx.mosqueId).maybeSingle(),
    supabase.from("mosque_branding").select("primary_color").eq("mosque_id", ctx.mosqueId).maybeSingle(),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        icon={<Globe className="h-5 w-5" />}
        title={t("publicLibrary")}
        description={t("publicLibraryDescription")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { href: "/admin/lessons", label: t("lessonLibrary") },
          { label: t("publicLibrary") },
        ]}
      />
      <PublicLibraryForm
        slug={mosque?.slug ?? ""}
        mosqueName={mosque?.name ?? ""}
        rootDomain={process.env.ROOT_DOMAIN ?? "mekteb.de"}
        brandColor={branding?.primary_color ?? "#15803d"}
        initial={{
          isEnabled: settings?.is_enabled ?? false,
          title: settings?.title ?? "",
          intro: settings?.intro ?? "",
          accentColor: settings?.accent_color ?? null,
          font: (settings?.font_style ?? "sans") as LibraryFont,
          theme: (settings?.theme ?? "system") as LibraryTheme,
          showLogo: settings?.show_logo ?? true,
          subdomain: settings?.subdomain ?? "",
          baseLocale: settings?.base_locale ?? mosque?.locale ?? "de",
        }}
      />
    </div>
  );
}
