import { NextRequest } from "next/server";
import { z } from "zod";

import {
  extractUser,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";

/**
 * Saved ayahs are a personal bookmark list, not mosque data — the table is
 * keyed on `user_id` alone with no `mosque_id`. So this deliberately uses
 * `extractUser` rather than a role guard: any signed-in user may keep them,
 * and RLS scopes every read and write to the owner.
 */

const createSchema = z.object({
  surahNumber: z.number().int().min(1).max(114),
  ayahNumber: z.number().int().min(1),
  surahName: z.string().min(1).max(128),
  arabicText: z.string().min(1),
  translationText: z.string().optional(),
  translationEdition: z.string().max(64).optional(),
  note: z.string().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const user = await extractUser(request);
  if (!user) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const { data, error } = await supabase
    .from("quran_saved_ayahs")
    .select(
      "id, surah_number, ayah_number, surah_name, arabic_text, translation_text, translation_edition, note, created_at",
    )
    .eq("user_id", user.userId)
    .order("surah_number")
    .order("ayah_number");

  if (error) return dbErr(error.message);

  return ok(
    (data ?? []).map((r) => ({
      id: r.id,
      surahNumber: r.surah_number,
      ayahNumber: r.ayah_number,
      surahName: r.surah_name,
      arabicText: r.arabic_text,
      translationText: r.translation_text,
      translationEdition: r.translation_edition,
      note: r.note,
      createdAt: r.created_at,
    })),
  );
}

export async function POST(request: NextRequest) {
  const user = await extractUser(request);
  if (!user) return unauthorized();

  const parsed = await parseJson(request, createSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const supabase = await createSupabaseForUser(request);

  // The client sends the ayah text so the row is self-contained — the list can
  // then render offline without re-fetching from the Quran API.
  const { data, error } = await supabase
    .from("quran_saved_ayahs")
    .upsert(
      {
        user_id: user.userId,
        surah_number: body.surahNumber,
        ayah_number: body.ayahNumber,
        surah_name: body.surahName,
        arabic_text: body.arabicText,
        translation_text: body.translationText ?? null,
        translation_edition: body.translationEdition ?? null,
        note: body.note ?? null,
      },
      { onConflict: "user_id,surah_number,ayah_number" },
    )
    .select("id")
    .maybeSingle();

  if (error) return dbErr(error.message);

  return ok({ id: data?.id ?? null, saved: true }, 201);
}
