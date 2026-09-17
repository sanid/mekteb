"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ChevronRight, ArrowUp, ArrowDown, Plus, X, RefreshCw } from "lucide-react";
import { SubmitButton } from "@/components/SubmitButton";
import { FormField, FormCard, inputCls } from "@/components/FormField";
import { createTopic, reorderTopics, resetCurriculumAction } from "./actions";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { emptyCard, listCard } from "@/components/ui/surfaces";

export interface Topic {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

export function TopicListClient({
  initialTopics,
  lessonCountByTopicArray,
}: {
  initialTopics: Topic[];
  lessonCountByTopicArray: { id: string; count: number }[];
}) {
  const t = useTranslations("Admin");
  const formRef = useRef<HTMLFormElement>(null);
  const [isPendingReorder, startTransition] = useTransition();
  const [isPendingReset, startResetTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);

  const lessonCountByTopic = new Map(
    lessonCountByTopicArray.map((item) => [item.id, item.count])
  );

  const [optimisticTopics, addOptimisticTopic] = useOptimistic(
    initialTopics,
    (state, newTopic: Topic | { type: 'reorder', next: Topic[] }) => {
      if ('type' in newTopic && newTopic.type === 'reorder') {
        return newTopic.next;
      }
      return [...state, newTopic as Topic];
    }
  );

  function handleResetCurriculum() {
    startResetTransition(async () => {
      await resetCurriculumAction();
    });
  }

  async function handleCreate(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;
    if (!title) return;

    formRef.current?.reset();

    const maxSort = optimisticTopics.reduce((max, t) => Math.max(max, t.sort_order), 0);

    addOptimisticTopic({
      id: Date.now().toString(), // temporary ID
      title,
      description,
      sort_order: maxSort + 1,
    } as Topic);

    await createTopic(formData);
    setAddOpen(false);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...optimisticTopics];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    
    startTransition(async () => {
      addOptimisticTopic({ type: 'reorder', next });
      await reorderTopics(next.map((tp) => tp.id));
    });
  }

  function moveDown(index: number) {
    if (index === optimisticTopics.length - 1) return;
    const next = [...optimisticTopics];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    
    startTransition(async () => {
      addOptimisticTopic({ type: 'reorder', next });
      await reorderTopics(next.map((tp) => tp.id));
    });
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold tracking-tight">{t("topics")}</h2>
        {optimisticTopics.length > 0 && (
          <span className="rounded-full bg-accent-subtle text-accent text-xs font-semibold px-2.5 py-0.5 ml-1">
            {optimisticTopics.length}
          </span>
        )}
        <div className="flex-1" />
        <ConfirmDialog
          variant="destructive"
          title={t("curriculumResetTitle")}
          description={t("curriculumResetConfirm")}
          confirmLabel={t("curriculumReset")}
          cancelLabel={t("cancel")}
          onConfirm={handleResetCurriculum}
          trigger={
            <button
              type="button"
              disabled={isPendingReset}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPendingReset ? "animate-spin" : ""}`} />
              {t("curriculumReset")}
            </button>
          }
        />
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className={buttonVariants({ size: "sm" })}
        >
          {addOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {addOpen ? t("cancel") : t("addTopic")}
        </button>
      </div>


      {addOpen ? (
      <FormCard
        title={t("addTopic")}
        description={t("topicFormDesc")}
      >
        <form ref={formRef} action={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={t("topicTitle")} required>
              <input
                name="title"
                required
                placeholder={t("topicTitlePlaceholder")}
                className={inputCls}
              />
            </FormField>
            <FormField label={t("descriptionOpt")}>
              <input
                name="description"
                placeholder={t("descriptionPlaceholder")}
                className={inputCls}
              />
            </FormField>
          </div>
          <SubmitButton pendingText={t("saving")}>
            {t("addTopic")}
          </SubmitButton>
        </form>
      </FormCard>
      ) : null}

      {optimisticTopics.length > 0 ? (
        <ul className={listCard}>
          {optimisticTopics.map((tp, i) => {
            const count = lessonCountByTopic.get(tp.id) ?? 0;
            return (
              <li key={tp.id} className="flex items-stretch group">
                <div className="flex flex-col justify-center shrink-0 border-r border-card-border px-1 gap-0.5 py-1">
                  <button
                    type="button"
                    disabled={i === 0 || isPendingReorder}
                    onClick={() => moveUp(i)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-accent-subtle disabled:opacity-30 transition-colors"
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={i === optimisticTopics.length - 1 || isPendingReorder}
                    onClick={() => moveDown(i)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-accent-subtle disabled:opacity-30 transition-colors"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Link
                  href={`/admin/lessons/topics/${tp.id}`}
                  className="flex flex-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-accent-subtle"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{tp.title}</div>
                    <div className="flex items-center gap-2 text-sm text-muted">
                      {tp.description && <span className="truncate">{tp.description}</span>}
                      <span className="shrink-0 text-xs rounded-full bg-accent-subtle text-accent px-2 py-0.5">
                        {count} {count === 1 ? t("lessonSingular") : t("lessons").toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className={emptyCard}>
          {t("noTopics")}
        </div>
      )}
    </section>
  );
}

