import { buttonVariants } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { ClipboardCheck } from "lucide-react";

import { requireExaminer } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/PageHeader";
import DiplomaPicker from "@/components/DiplomaPicker";
import WrittenTestPanel from "@/components/WrittenTestPanel";
import LessonChecklist from "./LessonChecklist";

import {
  proposeExamSchedule,
  examinerCounterDate,
  examinerAcceptCounter,
  startExamConducting,
  completeExamSession,
  markDiplomaGenerated,
  proposeRetake,
} from "./actions";

type PageProps = { params: Promise<{ id: string }> };

type SessionRow = {
  id: string;
  student_profile_id: string;
  status: string;
  summary: string | null;
  exam_date: string;
  from_group_id: string;
  diploma_generated_at: string | null;
  schedule_status: string | null;
  proposed_date: string | null;
  proposed_by: string | null;
  oral_required: boolean;
  written_required: boolean;
  oral_passed: boolean | null;
  written_passed: boolean | null;
  retake_of_session_id: string | null;
};

export default async function ExamWorkflowPage({ params }: PageProps) {
  const { id: requestId } = await params;
  const ctx = await requireExaminer();
  await requirePlugin(ctx.mosqueId, "exam_system", "/examiner");
  const t = await getTranslations("Examiner");
  const locale = await getLocale();
  const supabase = await createClient();
  const hdrs = await headers();
  const origin = `${hdrs.get("x-forwarded-proto") ?? "http"}://${hdrs.get("host") ?? "localhost:3000"}`;

  const { data: request } = await supabase
    .from("exam_requests")
    .select(
      "id, notes, status, created_at, group_id, student_profiles(full_name), groups(name), teacher_profiles!exam_requests_requested_by_fkey(profile_id, profiles(full_name))",
    )
    .eq("id", requestId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!request) notFound();

  const student = request.student_profiles as { full_name: string } | null;
  const group = request.groups as { name: string } | null;
  const teacher = request.teacher_profiles as { profiles: { full_name: string } | null } | null;
  const teacherName = (teacher?.profiles as { full_name: string } | null)?.full_name ?? "—";

  const { data: existingSessionRaw } = await supabase
    .from("exam_sessions")
    .select(
      "id, student_profile_id, status, summary, exam_date, from_group_id, diploma_generated_at, schedule_status, proposed_date, proposed_by, oral_required, written_required, oral_passed, written_passed, retake_of_session_id",
    )
    .eq("exam_request_id", requestId)
    .eq("mosque_id", ctx.mosqueId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const existingSession = existingSessionRaw as SessionRow | null;

  const { data: allGroups } = await supabase
    .from("groups")
    .select("id, name")
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_active", true)
    .order("name");

  const fromGroupId = (request as { group_id?: string }).group_id ?? existingSession?.from_group_id;
  const targetGroups = (allGroups ?? []).filter((g) => g.id !== fromGroupId);

  const status = existingSession?.status;
  const schedule = existingSession?.schedule_status;

  // Written test data — only needed when session exists + written_required
  const needsWrittenPanel = existingSession?.written_required &&
    ["scheduled", "in_progress", "passed", "failed"].includes(status ?? "");

  const [writtenTestResult, questionsResult, topicsResult] = needsWrittenPanel
    ? await Promise.all([
        supabase
          .from("written_tests")
          .select("id, token, status, overall_result")
          .eq("exam_session_id", existingSession!.id)
          .eq("mosque_id", ctx.mosqueId)
          .maybeSingle(),
        supabase
          .from("exam_questions")
          .select("id, question_text, topic_id, difficulty")
          .eq("mosque_id", ctx.mosqueId)
          .eq("is_active", true)
          .order("topic_id", { nullsFirst: false })
          .order("question_text"),
        supabase
          .from("topics")
          .select("id, title")
          .eq("mosque_id", ctx.mosqueId)
          .order("sort_order"),
      ])
    : [{ data: null }, { data: [] }, { data: [] }];

  const existingWrittenTest = writtenTestResult.data;
  const examQuestions = questionsResult.data ?? [];
  const examTopics = topicsResult.data ?? [];

  // Lesson checklist — the curriculum ticked off while examining.
  const sessionActive =
    existingSession &&
    ["scheduled", "in_progress", "passed", "failed"].includes(existingSession.status ?? "");
  const [lessonsResult, checksResult] = sessionActive
    ? await Promise.all([
        supabase
          .from("lessons")
          .select("id, title")
          .eq("mosque_id", ctx.mosqueId)
          .eq("is_published", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("exam_lesson_results")
          .select("lesson_id")
          .eq("exam_session_id", existingSession!.id),
      ])
    : [{ data: [] }, { data: [] }];
  const checklistLessons = (lessonsResult.data ?? []) as { id: string; title: string }[];
  const checkedLessons = ((checksResult.data ?? []) as { lesson_id: string }[]).map(
    (c) => c.lesson_id,
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<ClipboardCheck className="h-5 w-5" />}
        title={t("examDetail")}
        breadcrumbs={[
          { href: "/examiner", label: t("overview") },
          { label: student?.full_name ?? "—" },
        ]}
      />

      <section className="space-y-3 rounded-xl border border-card-border bg-card p-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted">{t("student")}</div>
            <div className="font-medium">{student?.full_name ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted">{t("group")}</div>
            <div className="font-medium">{group?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted">{t("requestedBy")}</div>
            <div className="font-medium">{teacherName}</div>
          </div>
          {request.notes ? (
            <div>
              <div className="text-muted">{t("notes")}</div>
              <div className="font-medium">{request.notes}</div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Lesson checklist — tick off while examining, read-only in the result. */}
      {sessionActive ? (
        <LessonChecklist
          sessionId={existingSession!.id}
          lessons={checklistLessons}
          checked={checkedLessons}
          editable={
            existingSession!.status === "in_progress" ||
            existingSession!.status === "scheduled"
          }
        />
      ) : null}

      {/* Written test panel — visible once session is active */}
      {needsWrittenPanel ? (
        <WrittenTestPanel
          examSessionId={existingSession!.id}
          studentName={student?.full_name ?? "—"}
          existingTest={existingWrittenTest as { id: string; token: string; status: string; overall_result: string | null } | null}
          questions={examQuestions as { id: string; question_text: string; topic_id: string | null; difficulty: string }[]}
          topics={examTopics as { id: string; title: string }[]}
          locale={locale}
          origin={origin}
        />
      ) : null}

      {/* No session yet — propose schedule */}
      {request.status === "pending" && !existingSession ? (
        <ActionForm
          action={proposeExamSchedule.bind(null, requestId)}
          successMessage={t("examSaved")}
          className="space-y-4 rounded-xl border border-card-border bg-card p-6"
        >
          <h3 className="text-base font-semibold">{t("proposeSchedule")}</h3>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("proposedDate")}</span>
            <input
              type="date"
              name="proposed_date"
              required
              className="block w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm"
            />
          </label>
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="oral_required" defaultChecked />
              <span>{t("oralPart")}</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm ml-4">
              <input type="checkbox" name="written_required" defaultChecked />
              <span>{t("writtenPart")}</span>
            </label>
          </div>
          <button
            type="submit"
            className={buttonVariants({ size: "xl" })}
          >
            {t("proposeSchedule")}
          </button>
        </ActionForm>
      ) : null}

      {/* Session exists — schedule_status='proposed' (examiner waiting) */}
      {existingSession && schedule === "proposed" ? (
        <section className="space-y-4 rounded-xl border border-card-border bg-card p-6">
          <div className="text-sm">
            {t("waitingForConfirmation")}: <strong>{existingSession.proposed_date}</strong>
          </div>
          <ActionForm
            action={examinerCounterDate.bind(null, existingSession.id)}
            successMessage={t("examSaved")}
            className="space-y-3"
          >
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t("sendNewProposal")}</span>
              <input
                type="date"
                name="proposed_date"
                required
                defaultValue={existingSession.proposed_date ?? ""}
                className="block w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm"
              />
            </label>
            <button
              type="submit"
              className={buttonVariants({ size: "xl" })}
            >
              {t("sendNewProposal")}
            </button>
          </ActionForm>
        </section>
      ) : null}

      {/* Counter-proposal from parent/student */}
      {existingSession && schedule === "counter_proposed" &&
        (existingSession.proposed_by === "parent" || existingSession.proposed_by === "student") ? (
        <section className="space-y-4 rounded-xl border border-card-border bg-card p-6">
          <div className="text-sm">
            {t("counterProposalFrom")} ({existingSession.proposed_by}):{" "}
            <strong>{existingSession.proposed_date}</strong>
          </div>
          <div className="flex gap-3">
            <ActionForm
              action={examinerAcceptCounter.bind(null, existingSession.id)}
              successMessage={t("examSaved")}
            >
              <button
                type="submit"
                className={buttonVariants({ size: "xl" })}
              >
                {t("acceptCounter")}
              </button>
            </ActionForm>
          </div>
          <ActionForm
            action={examinerCounterDate.bind(null, existingSession.id)}
            successMessage={t("examSaved")}
            className="space-y-3"
          >
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t("sendNewProposal")}</span>
              <input
                type="date"
                name="proposed_date"
                required
                defaultValue={existingSession.proposed_date ?? ""}
                className="block w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm"
              />
            </label>
            <button
              type="submit"
              className={buttonVariants({ size: "xl" })}
            >
              {t("sendNewProposal")}
            </button>
          </ActionForm>
        </section>
      ) : null}

      {/* Confirmed, scheduled — ready to conduct */}
      {existingSession && schedule === "confirmed" && status === "scheduled" ? (
        <section className="space-y-3 rounded-xl border border-card-border bg-card p-6">
          <div className="text-sm">
            {t("confirmedFor")}: <strong>{existingSession.exam_date}</strong>
          </div>
          <ActionForm
            action={startExamConducting.bind(null, existingSession.id)}
            successMessage={t("examSaved")}
          >
            <button
              type="submit"
              className={buttonVariants({ size: "xl" })}
            >
              {t("startConducting")}
            </button>
          </ActionForm>
        </section>
      ) : null}

      {/* In progress — complete form */}
      {existingSession && status === "in_progress" ? (
        <ActionForm
          action={completeExamSession.bind(null, existingSession.id)}
          successMessage={t("examSaved")}
          className="space-y-4 rounded-xl border border-card-border bg-card p-6"
        >
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("summary")}</span>
            <textarea
              name="summary"
              rows={4}
              defaultValue={existingSession.summary ?? ""}
              placeholder={t("summaryPlaceholder")}
              className="w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("result")}</legend>
            {existingSession.oral_required ? (
              <label className="inline-flex items-center gap-2 text-sm mr-4">
                <input type="checkbox" name="oral_passed" />
                <span>{t("oralPassed")}</span>
              </label>
            ) : null}
            {existingSession.written_required ? (
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" name="written_passed" />
                <span>{t("writtenPassed")}</span>
              </label>
            ) : null}
          </fieldset>

          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("promoteToGroup")}</span>
            <select
              name="to_group_id"
              defaultValue=""
              className="mt-1 block w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm"
            >
              <option value="">{t("selectGroup")}</option>
              {targetGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className={buttonVariants({ size: "xl" })}
          >
            {t("saveExam")}
          </button>
        </ActionForm>
      ) : null}

      {/* Completed — passed */}
      {existingSession && status === "passed" ? (
        <section className="space-y-3 rounded-xl border border-card-border bg-card p-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t("result")}:</span>
            <span className="text-xs rounded-full px-2.5 py-0.5 font-medium bg-success-subtle text-success-fg">
              {t("passed")}
            </span>
          </div>
          {existingSession.summary ? (
            <div className="text-sm text-muted">{existingSession.summary}</div>
          ) : null}
          <div className="text-xs text-muted">{t("date")}: {existingSession.exam_date}</div>
          <div className="flex items-center gap-3 pt-2">
            <DiplomaPicker sessionId={existingSession.id} label={t("generateDiploma")} />
            <ActionForm
              action={markDiplomaGenerated.bind(null, existingSession.id)}
              successMessage={t("diplomaGenerated")}
            >
              <button
                type="submit"
                disabled={!!existingSession.diploma_generated_at}
                className="text-xs text-muted hover:text-foreground disabled:opacity-50"
              >
                {existingSession.diploma_generated_at ? t("diplomaGenerated") : t("generateDiploma")}
              </button>
            </ActionForm>
          </div>
        </section>
      ) : null}

      {/* Completed — failed: show result + retake form */}
      {existingSession && status === "failed" ? (
        <>
          <section className="space-y-3 rounded-xl border border-card-border bg-card p-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t("result")}:</span>
              <span className="text-xs rounded-full px-2.5 py-0.5 font-medium bg-danger-subtle text-danger-fg">
                {t("failed")}
              </span>
            </div>
            {existingSession.summary ? (
              <div className="text-sm text-muted">{existingSession.summary}</div>
            ) : null}
            <div className="text-xs text-muted">{t("date")}: {existingSession.exam_date}</div>
          </section>

          <ActionForm
            action={proposeRetake.bind(null, existingSession.id)}
            successMessage={t("examSaved")}
            className="space-y-4 rounded-xl border border-card-border bg-card p-6"
          >
            <h3 className="text-base font-semibold">{t("proposeRetake")}</h3>
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t("proposedDate")}</span>
              <input
                type="date"
                name="proposed_date"
                required
                className="block w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm"
              />
            </label>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="oral_required"
                  defaultChecked={existingSession.oral_required}
                />
                <span>{t("oralPart")}</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm ml-4">
                <input
                  type="checkbox"
                  name="written_required"
                  defaultChecked={existingSession.written_required}
                />
                <span>{t("writtenPart")}</span>
              </label>
            </div>
            <button
              type="submit"
              className={buttonVariants({ size: "xl" })}
            >
              {t("proposeRetake")}
            </button>
          </ActionForm>
        </>
      ) : null}
    </div>
  );
}
