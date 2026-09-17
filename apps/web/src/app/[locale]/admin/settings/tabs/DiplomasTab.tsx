import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TemplatesListClient } from "../diplomas/TemplatesListClient";
import { seedStandardTemplates } from "../diplomas/actions";

export async function DiplomasTab() {
  await requireAdmin();
  const supabase = await createClient();

  await seedStandardTemplates();

  const { data: templates } = await supabase
    .from("diploma_templates")
    .select("id, name, orientation, is_active, system_key, background_image_url, created_at")
    .order("system_key", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return (
    <div className="pt-6 max-w-3xl">
      <TemplatesListClient initialTemplates={templates ?? []} />
    </div>
  );
}
