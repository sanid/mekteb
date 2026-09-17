"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ClipboardList, Copy, Check, ExternalLink } from "lucide-react";
import { createOnlineWrittenTest } from "@/app/[locale]/examiner/exams/[id]/writtenTestActions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { inputCls } from "@/components/FormField";

type Question = { id: string; question_text: string; topic_id: string | null; difficulty: string };
type Topic = { id: string; title: string };

type WrittenTest = {
  id: string;
  token: string;
  status: string;
  overall_result: string | null;
};

type Props = {
  examSessionId: string;
  studentName: string;
  existingTest: WrittenTest | null;
  questions: Question[];
  topics: Topic[];
  locale: string;
  origin: string;
};

export default function WrittenTestPanel({
  examSessionId,
  studentName,
  existingTest,
  questions,
  topics,
  locale,
  origin,
}: Props) {
  const t = useTranslations("Examiner");
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "pick">(existingTest ? "idle" : "idle");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterTopic, setFilterTopic] = useState("all");
  const [title, setTitle] = useState(t("wtDefaultTitle", { name: studentName }));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const testUrl = existingTest ? `${origin}/${locale}/test/${existingTest.token}` : "";

  function toggleQ(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleCreate() {
    if (selected.size === 0 || !title.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await createOnlineWrittenTest({
          exam_session_id: examSessionId,
          title: title.trim(),
          question_ids: Array.from(selected),
          origin,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("wtError"));
      }
    });
  }

  function copyLink() {
    navigator.clipboard.writeText(testUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const filtered = filterTopic === "all"
    ? questions
    : questions.filter((q) => q.topic_id === filterTopic);

  // ── Existing test: show status ─────────────────────────────────────────
  if (existingTest) {
    const statusLabel =
      existingTest.status === "pending" ? t("wtPending")
      : existingTest.status === "submitted" ? t("wtSubmitted")
      : existingTest.overall_result === "passed" ? t("wtPassed")
      : t("wtFailed");

    const statusColor =
      existingTest.status === "pending" ? "text-muted"
      : existingTest.status === "submitted" ? "text-warning-fg"
      : existingTest.overall_result === "passed" ? "text-success-fg"
      : "text-danger-fg";

    return (
      <section className="space-y-3 rounded-xl border border-card-border bg-card p-5">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-accent shrink-0" />
          <h3 className="text-base font-semibold tracking-tight">{t("wtTitle")}</h3>
        </div>
        <p className={`text-sm font-medium ${statusColor}`}>{statusLabel}</p>

        {existingTest.status === "pending" && (
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-accent-subtle px-2 py-1 text-xs font-mono text-muted">
              {testUrl}
            </code>
            <button
              onClick={copyLink}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
              {copied ? t("wtCopied") : t("wtCopyLink")}
            </button>
          </div>
        )}

        {existingTest.status === "submitted" && (
          <a
            href={`/${locale}/examiner/written-tests/${existingTest.id}`}
            className={buttonVariants({ size: "sm" })}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            {t("wtGrade")}
          </a>
        )}

        {existingTest.status === "graded" && (
          <a
            href={`/${locale}/examiner/written-tests/${existingTest.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("wtResults")}
          </a>
        )}
      </section>
    );
  }

  // ── No test yet: create ────────────────────────────────────────────────
  if (mode === "idle") {
    return (
      <section className="rounded-xl border border-dashed border-card-border p-5 space-y-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted shrink-0" />
          <h3 className="text-base font-semibold tracking-tight">{t("wtTitle")}</h3>
        </div>
        <p className="text-sm text-muted">
          {t("wtIntro")}
        </p>
        <button
          onClick={() => setMode("pick")}
          className={cn(buttonVariants({ size: "sm" }), "mt-1")}
        >
          {t("wtCreate")}
        </button>
      </section>
    );
  }

  // ── Question picker ────────────────────────────────────────────────────
  return (
    <section className="space-y-4 rounded-xl border border-card-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold tracking-tight">{t("wtPick")}</h3>
        <button onClick={() => setMode("idle")} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          {t("wtCancel")}
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted mb-1">{t("wtTitleLabel")}</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
        />
      </div>

      <select
        value={filterTopic}
        onChange={(e) => setFilterTopic(e.target.value)}
        className={cn(inputCls, "w-auto")}
      >
        <option value="all">{t("wtAllTopics")}</option>
        {topics.map((tp) => <option key={tp.id} value={tp.id}>{tp.title}</option>)}
      </select>

      <div className="border border-card-border rounded-lg max-h-64 overflow-y-auto divide-y divide-card-border">
        {filtered.map((q) => (
          <label key={q.id} className="flex items-start gap-2.5 px-3 py-2 hover:bg-accent-subtle cursor-pointer">
            <input
              type="checkbox"
              checked={selected.has(q.id)}
              onChange={() => toggleQ(q.id)}
              className="mt-0.5 shrink-0"
            />
            <span className="text-sm leading-snug flex-1">{q.question_text}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted">{t("wtSelected", { count: selected.size })}</span>
        <button
          onClick={handleCreate}
          disabled={isPending || selected.size === 0 || !title.trim()}
          className={buttonVariants({ size: "sm" })}
        >
          {isPending ? t("wtCreating") : t("wtSend")}
        </button>
      </div>
      {error && <p className="text-xs text-danger-fg">{error}</p>}
    </section>
  );
}
