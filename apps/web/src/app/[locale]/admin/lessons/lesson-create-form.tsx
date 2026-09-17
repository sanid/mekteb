"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { DynamicBlockNoteEditor } from "@/components/DynamicBlockNoteEditor";
import { useTranslations, useLocale } from "next-intl";
import { FormField, FormCard, inputCls, selectCls } from "@/components/FormField";
import { SubmitButton } from "@/components/SubmitButton";

import { createLesson } from "./actions";
import { buttonVariants } from "@/components/ui/button";

interface Topic {
  id: string;
  title: string;
}

export function LessonCreateForm({
  topics,
  defaultTopicId,
  mosqueId,
}: {
  topics: Topic[];
  defaultTopicId?: string;
  mosqueId?: string;
}) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const formRef = useRef<HTMLFormElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [result, formAction] = useActionState(
    (_: unknown, formData: FormData) => createLesson(formData),
    null,
  );

  const isError = (r: unknown) =>
    !!r && typeof r === "object" && "error" in r;

  // Collapsing the panel is state, so it is adjusted during render; toasting
  // and resetting the DOM form are external effects and stay in the effect.
  const [handledResult, setHandledResult] = useState(result);
  if (handledResult !== result) {
    setHandledResult(result);
    if (result && !isError(result)) setAddOpen(false);
  }

  useEffect(() => {
    if (!result) return;
    if (isError(result)) {
      toast.error((result as { error: string }).error);
    } else {
      toast.success(t("lessonSaved"));
      formRef.current?.reset();
    }
  }, [result, t]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className={buttonVariants({ size: "sm" })}
        >
          {addOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {addOpen ? t("cancel") : t("addLesson")}
        </button>
      </div>
      {addOpen ? (
    <FormCard
      title={t("addLesson")}
      description={t("lessonFormDesc")}
    >
      <form ref={formRef} action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label={t("lessonTitle")} required>
            <input
              name="title"
              required
              placeholder={t("lessonTitlePlaceholder")}
              className={inputCls}
            />
          </FormField>
          <FormField label={t("topic")}>
            <select
              name="topic_id"
              defaultValue={defaultTopicId ?? ""}
              className={selectCls}
            >
              <option value="">{t("noTopic")}</option>
              {topics.map((topicItem) => (
                <option key={topicItem.id} value={topicItem.id}>
                  {topicItem.title}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField label={t("content")}>
          <DynamicBlockNoteEditor
            name="body"
            locale={locale}
            mosqueId={mosqueId}
            lessonId="drafts"
          />
        </FormField>
        <SubmitButton pendingText={t("saving")}>
          {t("addLesson")}
        </SubmitButton>
      </form>
    </FormCard>
      ) : null}
    </div>
  );
}
