import { createClient } from "@/lib/supabase/server";

export async function getSchoolYearStart(
  mosqueId: string,
): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mosques")
    .select("school_year_start")
    .eq("id", mosqueId)
    .maybeSingle();

  if (data?.school_year_start) return data.school_year_start;

  const now = new Date();
  const sep = new Date(now.getFullYear(), 8, 1);
  return now >= sep
    ? sep.toISOString().slice(0, 10)
    : new Date(now.getFullYear() - 1, 8, 1).toISOString().slice(0, 10);
}
