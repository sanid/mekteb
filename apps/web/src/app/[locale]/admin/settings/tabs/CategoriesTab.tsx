import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CategoriesClient } from "../categories/CategoriesClient";

export async function CategoriesTab() {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("group_categories")
    .select("id, name, color, is_hifz")
    .eq("mosque_id", ctx.mosqueId)
    .order("created_at", { ascending: true });

  return (
    <div className="pt-6 max-w-2xl">
      <CategoriesClient initialCategories={categories ?? []} />
    </div>
  );
}
