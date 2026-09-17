"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Block } from "@blocknote/core";
import { Plus } from "lucide-react";

import { DynamicBlockNoteEditor } from "@/components/DynamicBlockNoteEditor";
import { useTranslations, useLocale } from "next-intl";

import type { ActionResult } from "@/lib/action-result";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { inputCls } from "@/components/FormField";
import { useConfirm } from "@/components/ConfirmDialog";
/**
 * The three server actions this form drives. Injected so the same editor
 * serves the admin portal (admin-scoped actions) and the teacher portal
 * (teacher-scoped actions) without duplicating ~300 lines of UI.
 */
export interface LessonEditActions {
  updateLesson: (formData: FormData) => Promise<ActionResult>;
  upsertTranslation: (formData: FormData) => Promise<ActionResult>;
  deleteTranslation: (formData: FormData) => Promise<ActionResult>;
}

interface Topic {
  id: string;
  title: string;
}

interface Translation {
  locale: string;
  title: string;
  body: unknown[] | null;
}

interface LessonEditFormProps {
  lessonId: string;
  mosqueId: string;
  title: string;
  body: unknown[] | null;
  topicId: string | null;
  topics: Topic[];
  translations: Translation[];
  actions: LessonEditActions;
}

const ALL_LOCALES = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "bs", label: "Bosanski" },
  { code: "tr", label: "Türkçe" },
];

// Inner form that handles a single locale translation (or the base lesson).
// Using a named component per-tab so each has its own useActionState.
function TranslationTab({
  lessonId,
  mosqueId,
  locale,
  initialTitle,
  initialBody,
  onDeleted,
  actions,
}: {
  lessonId: string;
  mosqueId: string;
  locale: string;
  initialTitle: string;
  initialBody: unknown[] | null;
  onDeleted: (locale: string) => void;
  actions: LessonEditActions;
}) {
  const t = useTranslations("Admin");
  const [confirm, confirmDialog] = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const [result, formAction] = useActionState(
    (_: unknown, formData: FormData) => actions.upsertTranslation(formData),
    null,
  );
  const [deleteResult, deleteAction] = useActionState(
    (_: unknown, formData: FormData) => actions.deleteTranslation(formData),
    null,
  );

  useEffect(() => {
    if (!result) return;
    if (typeof result === "object" && "error" in result) {
      toast.error((result as { error: string }).error);
    } else {
      toast.success(t("lessonSaved"));
    }
  }, [result, t]);

  useEffect(() => {
    if (!deleteResult) return;
    if (typeof deleteResult === "object" && "error" in deleteResult) {
      toast.error((deleteResult as { error: string }).error);
    } else {
      onDeleted(locale);
    }
  }, [deleteResult, locale, onDeleted]);

  const initialBlocks: Block[] | undefined =
    Array.isArray(initialBody) && initialBody.length > 0
      ? (initialBody as unknown as Block[])
      : undefined;

  async function handleDelete() {
    if (!(await confirm({ title: t("confirmDeleteTranslation") }))) return;
    const fd = new FormData();
    fd.set("lesson_id", lessonId);
    fd.set("locale", locale);
    deleteAction(fd);
  }

  return (
    <div className="space-y-3">
      {confirmDialog}
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="lesson_id" value={lessonId} />
        <input type="hidden" name="locale" value={locale} />
        <input
          name="title"
          required
          defaultValue={initialTitle}
          placeholder={t("lessonTitle")}
          className={inputCls}
        />
        <DynamicBlockNoteEditor
          name="body"
          initialContent={initialBlocks}
          locale={locale}
          mosqueId={mosqueId}
          lessonId={lessonId}
        />
        <div className="flex items-center gap-3">
          <button type="submit" className={cn(buttonVariants({ size: "xl" }), "self-start")}>
            {t("save")}
          </button>
          <button
            type="button"
            className={buttonVariants({ variant: "destructive", size: "sm" })}
            onClick={handleDelete}
          >
            {t("deleteTranslation")}
          </button>
        </div>
      </form>
    </div>
  );
}

export function LessonEditForm({
  lessonId,
  mosqueId,
  title,
  body,
  topicId,
  topics,
  translations,
  actions,
}: LessonEditFormProps) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const formRef = useRef<HTMLFormElement>(null);

  // "base" is always the first tab; translation locales come after
  const [activeTab, setActiveTab] = useState<"base" | string>("base");
  const [activeTabs, setActiveTabs] = useState<string[]>(
    translations.map((tr) => tr.locale),
  );

  const [result, formAction] = useActionState(
    (_: unknown, formData: FormData) => actions.updateLesson(formData),
    null,
  );

  useEffect(() => {
    if (!result) return;
    if (typeof result === "object" && "error" in result) {
      toast.error((result as { error: string }).error);
    } else {
      toast.success(t("lessonSaved"));
    }
  }, [result, t]);

  const initialBlocks: Block[] | undefined =
    Array.isArray(body) && body.length > 0
      ? (body as unknown as Block[])
      : undefined;

  const availableToAdd = ALL_LOCALES.filter(
    (l) => !activeTabs.includes(l.code),
  );

  function addLanguage(code: string) {
    setActiveTabs((prev) => [...prev, code]);
    setActiveTab(code);
  }

  function handleDeleted(deletedLocale: string) {
    setActiveTabs((prev) => prev.filter((l) => l !== deletedLocale));
    setActiveTab("base");
    toast.success(t("translationDeleted"));
  }

  const tabLocaleLabel = (code: string) =>
    ALL_LOCALES.find((l) => l.code === code)?.label ?? code.toUpperCase();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">{t("editLesson")}</h2>
        {availableToAdd.length > 0 && (
          <div className="relative group">
            <button
              type="button"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("addLanguage")}
            </button>
            <div className="absolute right-0 top-full mt-1 z-10 hidden group-focus-within:flex group-hover:flex flex-col min-w-[130px] rounded-xl border border-card-border bg-popover p-1 shadow-elevated overflow-hidden">
              {availableToAdd.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  className="min-h-9 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-accent-subtle hover:text-accent transition-colors"
                  onClick={() => addLanguage(l.code)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-card-border -mx-5 px-5 pb-0">
        <button
          type="button"
          onClick={() => setActiveTab("base")}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "base"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("baseContent")}
        </button>
        {activeTabs.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setActiveTab(code)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === code
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tabLocaleLabel(code)}
          </button>
        ))}
      </div>

      {/* Base content tab */}
      {activeTab === "base" && (
        <form
          ref={formRef}
          action={formAction}
          className="flex flex-col gap-3 pt-2"
        >
          <input type="hidden" name="lesson_id" value={lessonId} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              name="title"
              required
              defaultValue={title}
              placeholder={t("lessonTitle")}
              className={inputCls}
            />
            <select
              name="topic_id"
              defaultValue={topicId ?? ""}
              className={inputCls}
            >
              <option value="">{t("noTopic")}</option>
              {topics.map((topicItem) => (
                <option key={topicItem.id} value={topicItem.id}>
                  {topicItem.title}
                </option>
              ))}
            </select>
          </div>
          <DynamicBlockNoteEditor
            name="body"
            initialContent={initialBlocks}
            locale={locale}
            mosqueId={mosqueId}
            lessonId={lessonId}
          />
          <button className={cn(buttonVariants({ size: "xl" }), "self-start")}>
            {t("save")}
          </button>
        </form>
      )}

      {/* Translation tabs */}
      {activeTabs.map((code) => {
        if (activeTab !== code) return null;
        const tr = translations.find((x) => x.locale === code);
        return (
          <div key={code} className="pt-2">
            <TranslationTab
              lessonId={lessonId}
              mosqueId={mosqueId}
              locale={code}
              initialTitle={tr?.title ?? ""}
              initialBody={tr?.body ?? null}
              onDeleted={handleDeleted}
              actions={actions}
            />
          </div>
        );
      })}
    </div>
  );
}
