import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildDiplomaDoc, buildCustomDiplomaDoc, type DiplomaVariant } from "@/lib/diploma-pdf";
import { dateFormatLocale } from "@/lib/format";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string; locale: string }> };

const ALLOWED_VARIANTS: DiplomaVariant[] = ["clean", "fancy", "islamic"];

export async function GET(req: Request, { params }: RouteParams) {
  const { id: sessionId } = await params;
  const ctx = await requireAdmin();
  const locale = await getLocale();
  const t = await getTranslations("Diploma");
  const supabase = await createClient();

  const url = new URL(req.url);
  const designParam = url.searchParams.get("design") as DiplomaVariant | null;
  const variant: DiplomaVariant =
    designParam && ALLOWED_VARIANTS.includes(designParam) ? designParam : "fancy";

  const { data: session } = await supabase
    .from("exam_sessions")
    .select(
      "id, status, exam_date, diploma_generated_at, examiner_profile_id, from_group_id, student_profiles(full_name), groups!exam_sessions_from_group_id_fkey(name)",
    )
    .eq("id", sessionId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("status", "passed")
    .maybeSingle();

  if (!session) notFound();

  const [{ data: examinerProfile }, { data: groupTeacher }] = await Promise.all([
    supabase
      .from("teacher_profiles")
      .select("profiles(full_name, display_name)")
      .eq("id", session.examiner_profile_id)
      .maybeSingle(),
    session.from_group_id
      ? supabase
          .from("teacher_group_links")
          .select("teacher_profiles(profiles(full_name, display_name))")
          .eq("group_id", session.from_group_id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const pickName = (p: { full_name: string | null; display_name: string | null } | null | undefined) =>
    p?.full_name ?? p?.display_name ?? null;
  const examinerName = pickName(examinerProfile?.profiles as never);
  const groupTeacherName = pickName(
    ((groupTeacher?.teacher_profiles as never) as { profiles: { full_name: string | null; display_name: string | null } | null } | null)?.profiles ?? null,
  );

  const { data: branding } = await supabase
    .from("mosque_branding")
    .select("primary_color")
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  const { data: mosque } = await supabase
    .from("mosques")
    .select("name")
    .eq("id", ctx.mosqueId)
    .maybeSingle();

  const student = (session.student_profiles as { full_name: string } | null)?.full_name ?? t("student");
  const groupName = (session.groups as { name: string } | null)?.name ?? t("group");
  const primaryColor = branding?.primary_color ?? "#1d4ed8";
  const mosqueName = mosque?.name ?? "Mosque";

  const dateLocale = dateFormatLocale(locale);
  const formattedDate = new Date(session.exam_date).toLocaleDateString(dateLocale, {
    year: "numeric", month: "long", day: "numeric",
  });

  // Fetch active custom template from DB
  const { data: activeTemplate } = await supabase
    .from("diploma_templates")
    .select("*")
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_active", true)
    .maybeSingle();

  const diplomaInput = {
    mosqueName,
    primaryColor,
    studentName: student,
    groupName,
    teacherName: groupTeacherName,
    examinerName,
    formattedDate,
    i18n: {
      title:    t("title"),
      subtitle: t("subtitle"),
      certify:  t("certify"),
      body:     t("body"),
      examiner: t("examiner"),
      teacher:  t("teacher"),
      date:     t("date"),
    },
    variant,
  };

  const doc = activeTemplate
    ? buildCustomDiplomaDoc(activeTemplate, diplomaInput)
    : buildDiplomaDoc(diplomaInput);

  const buffer = await renderToBuffer(doc);
  const safeName = student.replace(/[^\w-]+/g, "_");

  if (!session.diploma_generated_at) {
    await supabase
      .from("exam_sessions")
      .update({ diploma_generated_at: new Date().toISOString() })
      .eq("id", sessionId);
  }

  return new Response(new Blob([new Uint8Array(buffer)], { type: "application/pdf" }), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="diploma-${safeName}-${variant}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
