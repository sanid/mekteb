"use client";

import { useState, useMemo, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createQuestion, updateQuestion, toggleQuestionActive, deleteQuestion } from "./actions";
import { buttonVariants } from "@/components/ui/button";

import { useConfirm } from "@/components/ConfirmDialog";
type Question = {
  id: string;
  question_text: string;
  difficulty: string;
  topic_id: string | null;
  is_active: boolean;
};

type Topic = { id: string; title: string };

type Props = {
  questions: Question[];
  topics: Topic[];
};

type FormState = { mode: "add" } | { mode: "edit"; question: Question } | null;

const DIFF_CLASSES: Record<string, string> = {
  easy:   "bg-success-subtle text-success-fg",
  medium: "bg-warning-subtle text-warning-fg",
  hard:   "bg-danger-subtle text-danger-fg",
};

export default function QuestionBank({ questions, topics }: Props) {
  const t = useTranslations("WrittenTests");
  const [confirm, confirmDialog] = useConfirm();
  const [formState, setFormState] = useState<FormState>(null);
  const [filterTopic, setFilterTopic] = useState("all");
  const [filterDiff, setFilterDiff] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const topicMap = useMemo(
    () => Object.fromEntries(topics.map((t) => [t.id, t.title])),
    [topics]
  );

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (!showInactive && !q.is_active) return false;
      if (filterTopic !== "all" && q.topic_id !== filterTopic) return false;
      if (filterDiff !== "all" && q.difficulty !== filterDiff) return false;
      if (search.trim() && !q.question_text.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [questions, filterTopic, filterDiff, showInactive, search]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (formState?.mode === "edit") {
          await updateQuestion(formState.question.id, fd);
        } else {
          await createQuestion(fd);
        }
        setFormState(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fehler");
      }
    });
  }

  function handleToggle(q: Question) {
    startTransition(() => toggleQuestionActive(q.id, q.is_active));
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ title: t("confirmDelete") }))) return;
    startTransition(() => deleteQuestion(id));
  }

  const editingId = formState?.mode === "edit" ? formState.question.id : null;

  return (
    <div className="space-y-4">
      {confirmDialog}
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="rounded-md border border-card-border bg-card px-3 py-1.5 text-sm w-48"
          />
          <select
            value={filterTopic}
            onChange={(e) => setFilterTopic(e.target.value)}
            className="rounded-md border border-card-border bg-card px-3 py-1.5 text-sm"
          >
            <option value="all">{t("allTopics")}</option>
            {topics.map((tp) => (
              <option key={tp.id} value={tp.id}>{tp.title}</option>
            ))}
          </select>
          <select
            value={filterDiff}
            onChange={(e) => setFilterDiff(e.target.value)}
            className="rounded-md border border-card-border bg-card px-3 py-1.5 text-sm"
          >
            <option value="all">{t("allDifficulties")}</option>
            <option value="easy">{t("easy")}</option>
            <option value="medium">{t("medium")}</option>
            <option value="hard">{t("hard")}</option>
          </select>
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            {t("showInactive")}
          </label>
        </div>
        <button
          onClick={() => setFormState({ mode: "add" })}
          className={buttonVariants()}
        >
          + {t("addQuestion")}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} {t("questionsFound")}
        {!showInactive && questions.some((q) => !q.is_active) && (
          <span className="ml-1 text-muted-foreground/60">
            ({questions.filter((q) => !q.is_active).length} {t("inactive")})
          </span>
        )}
      </p>

      {/* Inline add form */}
      {formState?.mode === "add" && (
        <QuestionForm
          topics={topics}
          onSubmit={handleSubmit}
          onCancel={() => setFormState(null)}
          isPending={isPending}
          error={error}
          t={t}
        />
      )}

      {/* Question list */}
      <div className="border border-card-border rounded-lg overflow-hidden divide-y divide-card-border">
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("noQuestionsFound")}</p>
        )}
        {filtered.map((q) => (
          <div key={q.id} className={`px-4 py-3 ${!q.is_active ? "opacity-50" : ""}`}>
            {editingId === q.id ? (
              <QuestionForm
                topics={topics}
                initial={q}
                onSubmit={handleSubmit}
                onCancel={() => setFormState(null)}
                isPending={isPending}
                error={error}
                t={t}
              />
            ) : (
              <div className="flex items-start gap-3">
                <p className="flex-1 text-sm leading-snug">{q.question_text}</p>
                <div className="flex items-center gap-2 shrink-0">
                  {q.topic_id && (
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {topicMap[q.topic_id] ?? "—"}
                    </span>
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${DIFF_CLASSES[q.difficulty] ?? ""}`}>
                    {t(q.difficulty as "easy" | "medium" | "hard")}
                  </span>
                  <button
                    onClick={() => handleToggle(q)}
                    disabled={isPending}
                    title={q.is_active ? t("deactivate") : t("activate")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {q.is_active ? "●" : "○"}
                  </button>
                  <button
                    onClick={() => setFormState({ mode: "edit", question: q })}
                    className="text-xs text-muted-foreground hover:text-accent transition-colors"
                  >
                    {t("edit")}
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    disabled={isPending}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    {t("delete")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionForm({
  topics,
  initial,
  onSubmit,
  onCancel,
  isPending,
  error,
  t,
}: {
  topics: Topic[];
  initial?: Question;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isPending: boolean;
  error: string | null;
  t: ReturnType<typeof useTranslations<"WrittenTests">>;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 p-3 bg-accent-subtle rounded-lg">
      <textarea
        name="question_text"
        defaultValue={initial?.question_text}
        required
        minLength={5}
        rows={2}
        placeholder={t("questionTextPlaceholder")}
        className="w-full rounded-md border border-card-border bg-card px-3 py-2 text-sm resize-none"
      />
      <div className="flex flex-wrap gap-2">
        <select
          name="topic_id"
          defaultValue={initial?.topic_id ?? ""}
          className="rounded-md border border-card-border bg-card px-3 py-1.5 text-sm"
        >
          <option value="">{t("noTopicOption")}</option>
          {topics.map((tp) => (
            <option key={tp.id} value={tp.id}>{tp.title}</option>
          ))}
        </select>
        <select
          name="difficulty"
          defaultValue={initial?.difficulty ?? "medium"}
          className="rounded-md border border-card-border bg-card px-3 py-1.5 text-sm"
        >
          <option value="easy">{t("easy")}</option>
          <option value="medium">{t("medium")}</option>
          <option value="hard">{t("hard")}</option>
        </select>
        <div className="flex gap-2 ml-auto">
          <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={buttonVariants()}
          >
            {t("saveQuestion")}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
