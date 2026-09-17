import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type MosqueConfig = {
  schoolYearStart: string; // "YYYY-MM-DD"
  state: string;
};

export const getMosqueConfig = cache(async (mosqueId: string): Promise<MosqueConfig> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mosques")
    .select("school_year_start, state")
    .eq("id", mosqueId)
    .single();
  return {
    schoolYearStart: data?.school_year_start ?? new Date().toISOString().slice(0, 10),
    state: data?.state ?? "Berlin",
  };
});
