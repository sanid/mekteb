"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { QuestionRow, TopicRow } from "./actions";
import { buttonVariants } from "@/components/ui/button";

type Props = {
  questions: QuestionRow[];
  topics: TopicRow[];
  locale: string;
  pdfRoute?: string; // defaults to examiner route
};

type Mode = "random" | "manual";

export default function TestBuilder({ questions, topics, locale, pdfRoute }: Props) {
  const t = useTranslations("WrittenTests");

  const [mode, setMode] = useState<Mode>("random");
  const [filterTopic, setFilterTopic] = useState<string>("all");
  const [randomCount, setRandomCount] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);

  const filteredByTopic = useMemo(
    () =>
      filterTopic === "all"
        ? questions
        : questions.filter((q) => q.topic_id === filterTopic),
    [questions, filterTopic]
  );

  const searchFiltered = useMemo(
    () =>
      search.trim()
        ? filteredByTopic.filter((q) =>
            q.question_text.toLowerCase().includes(search.toLowerCase())
          )
        : filteredByTopic,
    [filteredByTopic, search]
  );

  function handleRandomPick() {
    const pool = [...filteredByTopic];
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picked = pool.slice(0, Math.min(randomCount, pool.length));
    setSelected(new Set(picked.map((q) => q.id)));
  }

  function toggleQuestion(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      searchFiltered.forEach((q) => next.add(q.id));
      return next;
    });
  }

  function deselectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      searchFiltered.forEach((q) => next.delete(q.id));
      return next;
    });
  }

  function handleGenerate() {
    if (selected.size === 0 || !title.trim()) return;
    setGenerating(true);
    const ids = Array.from(selected).join(",");
    const route = pdfRoute ?? `/${locale}/examiner/tests/pdf`;
    const url = `${route}?ids=${encodeURIComponent(ids)}&title=${encodeURIComponent(title.trim())}`;
    window.open(url, "_blank");
    setGenerating(false);
  }

  const topicMap = useMemo(
    () => Object.fromEntries(topics.map((t) => [t.id, t.title])),
    [topics]
  );

  const groupedSelected = useMemo(() => {
    const sel = questions.filter((q) => selected.has(q.id));
    const groups: Record<string, QuestionRow[]> = {};
    sel.forEach((q) => {
      const key = q.topic_id ?? "__none__";
      (groups[key] ??= []).push(q);
    });
    return groups;
  }, [questions, selected]);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("random")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "random"
              ? "bg-accent text-primary-foreground"
              : "bg-card border border-card-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("randomMode")}
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "manual"
              ? "bg-accent text-primary-foreground"
              : "bg-card border border-card-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("manualMode")}
        </button>
      </div>

      {/* Topic filter — shared between both modes */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">{t("filterByTopic")}</label>
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
        </div>

        {mode === "random" && (
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t("numberOfQuestions")}</label>
            <input
              type="number"
              min={1}
              max={filteredByTopic.length}
              value={randomCount}
              onChange={(e) => setRandomCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 rounded-md border border-card-border bg-card px-3 py-1.5 text-sm"
            />
          </div>
        )}

        {mode === "random" && (
          <button
            onClick={handleRandomPick}
            className={buttonVariants()}
          >
            {t("pickRandom")}
          </button>
        )}

        {mode === "manual" && (
          <div className="flex-1 min-w-48">
            <label className="block text-xs text-muted-foreground mb-1">{t("searchQuestions")}</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-md border border-card-border bg-card px-3 py-1.5 text-sm"
            />
          </div>
        )}
      </div>

      {/* Manual question list */}
      {mode === "manual" && (
        <div className="border border-card-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between bg-card px-4 py-2 border-b border-card-border">
            <span className="text-xs text-muted-foreground">
              {searchFiltered.length} {t("questionsFound")}
            </span>
            <div className="flex gap-3">
              <button onClick={selectAllFiltered} className="text-xs text-accent hover:underline">
                {t("selectAll")}
              </button>
              <button onClick={deselectAllFiltered} className="text-xs text-muted-foreground hover:underline">
                {t("deselectAll")}
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-card-border">
            {searchFiltered.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("noQuestionsFound")}</p>
            )}
            {searchFiltered.map((q) => (
              <label key={q.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-accent-subtle cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(q.id)}
                  onChange={() => toggleQuestion(q.id)}
                  className="mt-0.5 shrink-0"
                />
                <span className="text-sm leading-snug">{q.question_text}</span>
                <span className={`ml-auto shrink-0 text-xs px-1.5 py-0.5 rounded ${
                  q.difficulty === "easy" ? "bg-success-subtle text-success-fg" :
                  q.difficulty === "hard" ? "bg-danger-subtle text-danger-fg" :
                  "bg-warning-subtle text-warning-fg"
                }`}>
                  {t(q.difficulty as "easy" | "medium" | "hard")}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Selected preview */}
      {selected.size > 0 && (
        <div className="border border-card-border rounded-lg p-4 bg-card">
          <p className="text-sm font-medium mb-3">
            {t("selectedCount", { count: selected.size })}
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(groupedSelected).map(([topicId, qs]) => (
              <div key={topicId}>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {topicId === "__none__" ? t("noTopic") : (topicMap[topicId] ?? topicId)}
                </p>
                <ul className="space-y-0.5">
                  {qs.map((q, i) => (
                    <li key={q.id} className="text-xs text-muted-foreground flex gap-2">
                      <span className="shrink-0">{i + 1}.</span>
                      <span>{q.question_text}</span>
                      <button
                        onClick={() => toggleQuestion(q.id)}
                        className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Title + generate */}
      <div className="border-t border-card-border pt-5 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">{t("testTitle")}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("testTitlePlaceholder")}
            className="w-full rounded-md border border-card-border bg-card px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={selected.size === 0 || !title.trim() || generating}
          className={buttonVariants()}
        >
          {generating ? t("generating") : t("generatePdf")}
        </button>
      </div>
      {selected.size === 0 && (
        <p className="text-xs text-muted-foreground">{t("noQuestionsSelected")}</p>
      )}
    </div>
  );
}
