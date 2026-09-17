import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildWrittenTestPdf } from "@/lib/written-test-pdf";
import { getLocale } from "next-intl/server";
import { dateFormatLocale } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await requireAdmin();
  const locale = await getLocale();

  const url = new URL(req.url);
  const rawIds = url.searchParams.get("ids") ?? "";
  const title = url.searchParams.get("title")?.trim() || "Schriftliche Prüfung";

  const ids = rawIds
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 100);

  if (ids.length === 0) {
    return new Response("No questions selected", { status: 400 });
  }

  const supabase = await createClient();
  const { data: questions } = await supabase
    .from("exam_questions")
    .select("id, question_text")
    .eq("mosque_id", ctx.mosqueId)
    .in("id", ids);

  if (!questions || questions.length === 0) {
    return new Response("Questions not found", { status: 404 });
  }

  const ordered = ids
    .map((id) => questions.find((q) => q.id === id))
    .filter((q) => q !== undefined);

  const dateLocale =
    dateFormatLocale(locale);

  const formattedDate = new Date().toLocaleDateString(dateLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const buffer = await buildWrittenTestPdf({
    mosqueName: ctx.mosqueName,
    title,
    formattedDate,
    questions: ordered,
  });

  const safeTitle = title.replace(/[^a-z0-9äöüß\s-]/gi, "").trim().replace(/\s+/g, "-");

  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeTitle}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
