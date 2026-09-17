"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  SendHorizontal,
  Shield,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { listCard } from "@/components/ui/surfaces";
import { CursorDemo, type DemoStep } from "./CursorDemo";

/* ── Attendance ───────────────────────────────────────────────────────── */

type Status = "present" | "absent" | "late" | "excused";

// Same order, icons and colours as AttendanceTaker, so the demo matches the app.
const STATUS: {
  key: Status;
  icon: typeof Check;
  active: string;
  hover: string;
}[] = [
  {
    key: "present",
    icon: Check,
    active: "bg-success",
    hover: "hover:text-success-fg",
  },
  {
    key: "absent",
    icon: X,
    active: "bg-danger",
    hover: "hover:text-danger-fg",
  },
  {
    key: "late",
    icon: Clock,
    active: "bg-warning",
    hover: "hover:text-warning-fg",
  },
  {
    key: "excused",
    icon: Shield,
    active: "bg-info",
    hover: "hover:text-info-fg",
  },
];

const STUDENTS = [
  "Amina Hodžić",
  "Yusuf Demir",
  "Lejla Begić",
  "Omar Saleh",
  "Emir Kovač",
];
const GROUPS = [
  { name: "Mekteb I", time: "10:00", students: 5, color: "#0ea5e9" },
  { name: "Hifz III", time: "11:00", students: 8, color: "#8b5cf6" },
  { name: "Tajweed I", time: "12:00", students: 12, color: "#f59e0b" },
  { name: "Mekteb V", time: "13:00", students: 9, color: "#ec4899" },
];
const ATTENDANCE_SCRIPT: [number, Status][] = [
  [0, "present"],
  [1, "absent"],
  [2, "present"],
  [3, "late"],
  [4, "present"],
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function AttendanceDemo() {
  const t = useTranslations("Index");
  const [marks, setMarks] = useState<Record<number, Status>>({});
  const [view, setView] = useState<"groups" | "attendance">("groups");

  const set = (i: number, s: Status) => setMarks((m) => ({ ...m, [i]: s }));
  const steps: DemoStep[] = [
    { wait: 500 },
    { target: "group-0", run: () => setView("attendance"), wait: 700 },
    ...ATTENDANCE_SCRIPT.map(([i, s]) => ({
      target: `${i}-${s}`,
      run: () => set(i, s),
    })),
  ];
  const reset = () => {
    setMarks({});
    setView("groups");
  };

  const present = Object.values(marks).filter(
    (s) => s === "present" || s === "late",
  ).length;
  const done = Object.keys(marks).length === STUDENTS.length;

  return (
    <CursorDemo steps={steps} reset={reset} replayLabel={t("demo_replay")}>
      <div className="min-h-[21rem] overflow-hidden rounded-xl border border-card-border bg-card shadow-elevated">
        {view === "groups" ? (
          <div
            key="groups"
            className="animate-in fade-in slide-in-from-left-2 duration-300"
          >
            <div className="flex items-center justify-between border-b border-card-border px-4 py-3">
              <div className="text-sm font-semibold">{t("demo_groups")}</div>
              <div className="text-xs text-muted">{t("demo_today")}</div>
            </div>
            <ul className="divide-y divide-card-border">
              {GROUPS.map((g, i) => (
                <li key={g.name}>
                  <button
                    type="button"
                    data-demo={`group-${i}`}
                    onClick={() => setView("attendance")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface"
                  >
                    <span
                      className="h-9 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: g.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{g.name}</div>
                      <div className="text-xs text-muted">
                        {g.time} · {t("demo_students", { n: g.students })}
                      </div>
                    </div>
                    {i === 0 ? (
                      <span className="rounded-md bg-accent-subtle px-2 py-1 text-xs font-medium text-accent">
                        {t("demo_takeAttendance")}
                      </span>
                    ) : null}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div
            key="attendance"
            className="animate-in fade-in slide-in-from-right-2 duration-300"
          >
            <div className="flex items-center justify-between gap-3 border-b border-card-border px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setView("groups")}
                  aria-label={t("demo_back")}
                  className="-ml-1.5 inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div>
                  <div className="text-sm font-semibold">{t("demo_group")}</div>
                  <div className="text-xs text-muted">{t("demo_when")}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md bg-success-subtle px-2 py-1 font-medium text-success-fg transition-opacity",
                    done ? "opacity-100" : "opacity-0",
                  )}
                >
                  <Check className="h-3 w-3" />
                  {t("demo_saved")}
                </span>
                <span className="tabular-nums text-muted">
                  {t("demo_count", { n: present, total: STUDENTS.length })}
                </span>
              </div>
            </div>
            <ul className="divide-y divide-card-border">
              {STUDENTS.map((name, i) => (
                <li
                  key={name}
                  className="flex items-center justify-between gap-3 px-4 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-[11px] font-semibold text-accent">
                      {initials(name)}
                    </span>
                    <span className="truncate text-sm font-medium">{name}</span>
                  </div>
                  <div
                    className="flex gap-0.5 rounded-lg bg-surface p-[3px]"
                    role="radiogroup"
                    aria-label={name}
                  >
                    {STATUS.map(({ key, icon: Icon, active, hover }) => {
                      const on = marks[i] === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          title={t(`demo_${key}`)}
                          data-demo={`${i}-${key}`}
                          onClick={() => set(i, key)}
                          className={cn(
                            "inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-md px-2 text-[0.8125rem] font-medium transition-all",
                            on
                              ? `${active} text-white shadow-elevated dark:text-background`
                              : `text-muted hover:bg-card ${hover}`,
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="sr-only xl:not-sr-only">
                            {t(`demo_${key}`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </CursorDemo>
  );
}

/* ── Hifz ─────────────────────────────────────────────────────────────── */

type Hifz = "none" | "learning" | "done";
const SURAHS = [
  "An-Nas",
  "Al-Falaq",
  "Al-Ikhlas",
  "Al-Masad",
  "An-Nasr",
  "Al-Kafirun",
  "Al-Kawthar",
  "Al-Maʿun",
  "Quraysh",
  "Al-Fil",
  "Al-Humaza",
  "Al-ʿAsr",
];
const START: Hifz[] = SURAHS.map((_, i) => (i < 5 ? "done" : "none"));
const next: Record<Hifz, Hifz> = {
  none: "learning",
  learning: "done",
  done: "none",
};

export function HifzDemo() {
  const t = useTranslations("Index");
  const [state, setState] = useState<Hifz[]>(START);

  const cycle = (i: number) =>
    setState((s) => s.map((v, j) => (j === i ? next[v] : v)));
  const steps: DemoStep[] = [
    { target: "s5", run: () => cycle(5), wait: 500 },
    { target: "s5", run: () => cycle(5), wait: 400 },
    { target: "s6", run: () => cycle(6), wait: 500 },
    { target: "s6", run: () => cycle(6), wait: 400 },
    { target: "s7", run: () => cycle(7) },
  ];

  const done = state.filter((s) => s === "done").length;
  const pct = Math.round((done / SURAHS.length) * 100);

  return (
    <CursorDemo
      steps={steps}
      reset={() => setState(START)}
      replayLabel={t("demo_replay")}
    >
      <div className="rounded-xl border border-card-border bg-card p-4 shadow-elevated sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent">
            AH
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Amina Hodžić</div>
            <div className="text-xs text-muted">{t("demo_juz")}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold tabular-nums">{pct}%</div>
            <div className="text-xs text-muted">{t("demo_memorised")}</div>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-success transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {SURAHS.map((name, i) => {
            const s = state[i];
            return (
              <button
                key={name}
                type="button"
                data-demo={`s${i}`}
                onClick={() => cycle(i)}
                className={cn(
                  "flex h-10 items-center justify-between gap-2 rounded-lg border px-2.5 text-left text-[0.8125rem] font-medium transition-colors",
                  s === "done" &&
                    "border-transparent bg-success-subtle text-success-fg",
                  s === "learning" &&
                    "border-transparent bg-warning-subtle text-warning-fg",
                  s === "none" &&
                    "border-card-border text-muted hover:text-foreground",
                )}
              >
                <span className="truncate">
                  <span className="mr-1.5 tabular-nums opacity-60">
                    {114 - i}
                  </span>
                  {name}
                </span>
                {s === "done" ? (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                ) : null}
                {s === "learning" ? (
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-warning" />
            {t("demo_learning")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" />
            {t("demo_done")}
          </span>
        </div>
      </div>
    </CursorDemo>
  );
}

/* ── Messages ─────────────────────────────────────────────────────────── */

export function MessagesDemo() {
  const t = useTranslations("Index");
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const [read, setRead] = useState(false);

  const send = () => {
    if (!draft.trim()) return;
    setSent((s) => [...s, draft.trim()]);
    setDraft("");
    setRead(false);
  };
  const reset = () => {
    setDraft("");
    setSent([]);
    setRead(false);
  };

  const steps: DemoStep[] = [
    { target: "input", wait: 150 },
    { type: { text: t("demo_reply"), onChange: setDraft }, wait: 350 },
    {
      target: "send",
      run: () => {
        setSent([t("demo_reply")]);
        setDraft("");
      },
      wait: 1300,
    },
    { run: () => setRead(true) },
  ];

  return (
    <CursorDemo steps={steps} reset={reset} replayLabel={t("demo_replay")}>
      <div className={cn(listCard, "flex flex-col bg-card shadow-elevated")}>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent">
            MD
          </span>
          <div>
            <div className="text-sm font-semibold">Murat Demir</div>
            <div className="text-xs text-muted">{t("demo_parent")}</div>
          </div>
        </div>
        <div className="flex min-h-56 flex-col gap-2 bg-background px-4 py-4 text-sm">
          <div className="max-w-[80%] rounded-xl rounded-bl-sm border border-card-border bg-card px-3 py-2">
            {t("demo_incoming")}
          </div>
          {sent.map((m, i) => (
            <div
              key={i}
              className="ml-auto max-w-[80%] animate-in fade-in slide-in-from-bottom-1"
            >
              <div className="rounded-xl rounded-br-sm bg-accent px-3 py-2 text-primary-foreground">
                {m}
              </div>
              {i === sent.length - 1 ? (
                <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted">
                  {read ? (
                    <CheckCheck className="h-3.5 w-3.5 text-info" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {read ? t("demo_read") : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <form
          className="flex items-center gap-2 px-3 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            data-demo="input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("demo_placeholder")}
            className="h-10 min-w-0 flex-1 rounded-lg border border-card-border bg-background px-3 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            data-demo="send"
            aria-label={t("demo_send")}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </form>
      </div>
    </CursorDemo>
  );
}

/* ── Homework ─────────────────────────────────────────────────────────── */

export function HomeworkDemo() {
  const t = useTranslations("Index");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState<"next" | "two" | null>(null);
  const [items, setItems] = useState<{ title: string; due: string; fresh?: boolean }[]>([]);

  const reset = () => {
    setTitle("");
    setDue(null);
    setItems([]);
  };
  const publish = (text = title) => {
    if (!text.trim()) return;
    setItems((l) => [{ title: text.trim(), due: due === "two" ? t("demo_dueTwo") : t("demo_dueNext"), fresh: true }, ...l]);
    setTitle("");
    setDue(null);
  };

  const steps: DemoStep[] = [
    { target: "hw-input", wait: 150 },
    { type: { text: t("demo_hwText"), onChange: setTitle }, wait: 300 },
    { target: "due-next", run: () => setDue("next"), wait: 400 },
    { target: "hw-publish", run: () => publish(t("demo_hwText")), wait: 600 },
  ];

  return (
    <CursorDemo steps={steps} reset={reset} replayLabel={t("demo_replay")}>
      <div className="rounded-xl border border-card-border bg-card p-4 shadow-elevated sm:p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">{t("demo_homework")}</div>
          <div className="text-xs text-muted">Mekteb I</div>
        </div>
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            publish();
          }}
        >
          <input
            data-demo="hw-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("demo_hwPlaceholder")}
            className="h-10 w-full rounded-lg border border-card-border bg-background px-3 text-sm outline-none focus:border-accent"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">{t("demo_due")}</span>
            {(["next", "two"] as const).map((d) => (
              <button
                key={d}
                type="button"
                data-demo={`due-${d}`}
                onClick={() => setDue(d)}
                className={cn(
                  "h-8 rounded-md border px-2.5 text-xs font-medium transition-colors",
                  due === d ? "border-accent bg-accent-subtle text-accent" : "border-card-border text-muted hover:text-foreground",
                )}
              >
                {d === "next" ? t("demo_dueNext") : t("demo_dueTwo")}
              </button>
            ))}
            <button
              type="submit"
              data-demo="hw-publish"
              className="ml-auto inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t("demo_publish")}
            </button>
          </div>
        </form>
        <ul className="mt-4 divide-y divide-card-border rounded-lg border border-card-border">
          {[...items, { title: t("demo_hwOld"), due: t("demo_dueNext") }].slice(0, 3).map((it, i) => (
            <li key={`${it.title}-${i}`} className={cn("flex items-center justify-between gap-3 px-3 py-2.5", it.fresh && "animate-in fade-in slide-in-from-top-1")}>
              <span className="truncate text-sm">{it.title}</span>
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                  it.fresh ? "bg-success-subtle text-success-fg" : "bg-surface text-muted",
                )}
              >
                {it.fresh ? t("demo_published") : it.due}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </CursorDemo>
  );
}

/* ── Exams & diplomas ─────────────────────────────────────────────────── */

type Result = "pass" | "fail";
const EXAM_STUDENTS = ["Amina Hodžić", "Yusuf Demir", "Lejla Begić"];

export function ExamDemo() {
  const t = useTranslations("Index");
  const [results, setResults] = useState<Record<number, Result>>({});
  const [diploma, setDiploma] = useState<number | null>(null);

  const set = (i: number, r: Result) => setResults((m) => ({ ...m, [i]: r }));
  const reset = () => {
    setResults({});
    setDiploma(null);
  };
  const steps: DemoStep[] = [
    { target: "ex-0-pass", run: () => set(0, "pass") },
    { target: "ex-1-fail", run: () => set(1, "fail") },
    { target: "ex-2-pass", run: () => set(2, "pass"), wait: 500 },
    { target: "dip-0", run: () => setDiploma(0), wait: 1800 },
  ];

  return (
    <CursorDemo steps={steps} reset={reset} replayLabel={t("demo_replay")}>
      <div className="relative min-h-72 overflow-hidden rounded-xl border border-card-border bg-card shadow-elevated">
        <div className="border-b border-card-border px-4 py-3">
          <div className="text-sm font-semibold">{t("demo_exam")}</div>
          <div className="text-xs text-muted">Mekteb I</div>
        </div>
        <ul className="divide-y divide-card-border">
          {EXAM_STUDENTS.map((name, i) => (
            <li key={name} className="flex items-center justify-between gap-2 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-[11px] font-semibold text-accent">
                  {initials(name)}
                </span>
                <span className="truncate text-sm font-medium">{name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {results[i] === "pass" ? (
                  <button
                    type="button"
                    data-demo={`dip-${i}`}
                    onClick={() => setDiploma(i)}
                    className="h-8 rounded-md border border-card-border px-2 text-xs font-medium text-accent animate-in fade-in hover:bg-accent-subtle"
                  >
                    {t("demo_diploma")}
                  </button>
                ) : null}
                <div className="flex gap-0.5 rounded-lg bg-surface p-[3px]">
                  {(["pass", "fail"] as const).map((r) => {
                    const on = results[i] === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        data-demo={`ex-${i}-${r}`}
                        onClick={() => set(i, r)}
                        title={r === "pass" ? t("demo_pass") : t("demo_fail")}
                        className={cn(
                          "inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition-all",
                          on
                            ? cn(r === "pass" ? "bg-success" : "bg-warning", "text-white shadow-elevated dark:text-background")
                            : "text-muted hover:bg-card hover:text-foreground",
                        )}
                      >
                        {r === "pass" ? <Check className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                        <span className="sr-only sm:not-sr-only">{r === "pass" ? t("demo_pass") : t("demo_fail")}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {diploma !== null ? (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/30 p-4 animate-in fade-in">
            <div className="w-full max-w-xs rounded-lg border-4 border-double border-warning bg-[#fffdf7] p-5 text-center text-[#1c2420] shadow-overlay animate-in zoom-in-95">
              <MosqueIconSmall />
              <div className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-[#8a5a12]">{t("demo_certTitle")}</div>
              <div className="mt-2 text-lg font-bold">{EXAM_STUDENTS[diploma]}</div>
              <div className="mt-1 text-xs leading-relaxed text-[#5c685f]">{t("demo_certBody")}</div>
              <div className="mx-auto mt-4 h-px w-24 bg-[#e6dfd3]" />
              <button
                type="button"
                onClick={() => setDiploma(null)}
                className="mt-3 text-xs font-medium text-[#15803d] hover:underline"
              >
                {t("demo_close")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </CursorDemo>
  );
}

function MosqueIconSmall() {
  return (
    <svg viewBox="0 0 24 24" className="mx-auto h-7 w-7 text-[#15803d]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
      <path d="M12 3c-3 2.5-5 4.5-5 7h10c0-2.5-2-4.5-5-7zM5 21V10M19 21V10M3 21h18M9 21v-4a3 3 0 016 0v4" />
    </svg>
  );
}

/* ── Announcements ────────────────────────────────────────────────────── */

export function AnnouncementDemo() {
  const t = useTranslations("Index");
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState<"all" | "group">("group");
  const [pushed, setPushed] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setAudience("group");
    setPushed(null);
  };
  const publish = (text = title) => {
    if (!text.trim()) return;
    setPushed(text.trim());
    setTitle("");
  };

  const steps: DemoStep[] = [
    { target: "ann-input", wait: 150 },
    { type: { text: t("demo_annText"), onChange: setTitle }, wait: 300 },
    { target: "aud-all", run: () => setAudience("all"), wait: 400 },
    { target: "ann-publish", run: () => publish(t("demo_annText")), wait: 1500 },
  ];

  return (
    <CursorDemo steps={steps} reset={reset} replayLabel={t("demo_replay")}>
      <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <form
          className="space-y-3 rounded-xl border border-card-border bg-card p-4 shadow-elevated"
          onSubmit={(e) => {
            e.preventDefault();
            publish();
          }}
        >
          <div className="text-sm font-semibold">{t("demo_announcement")}</div>
          <textarea
            data-demo="ann-input"
            rows={3}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("demo_annPlaceholder")}
            className="w-full resize-none rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="flex flex-wrap gap-1.5">
            {(["group", "all"] as const).map((a) => (
              <button
                key={a}
                type="button"
                data-demo={`aud-${a}`}
                onClick={() => setAudience(a)}
                className={cn(
                  "h-8 rounded-md border px-2.5 text-xs font-medium transition-colors",
                  audience === a ? "border-accent bg-accent-subtle text-accent" : "border-card-border text-muted hover:text-foreground",
                )}
              >
                {a === "all" ? t("demo_audienceAll") : t("demo_audienceGroup")}
              </button>
            ))}
          </div>
          <button
            type="submit"
            data-demo="ann-publish"
            className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t("demo_publish")}
          </button>
        </form>

        {/* Parent's phone, lock screen */}
        <div className="aspect-[9/18] rounded-[1.6rem] border-[5px] border-foreground/90 bg-gradient-to-b from-[#1f3b2d] to-[#0c1712] p-2 shadow-overlay">
          <div className="mx-auto h-1.5 w-8 rounded-full bg-black/60" />
          <div className="mt-4 text-center text-2xl font-light tabular-nums text-white/90">9:41</div>
          {pushed ? (
            <div className="mt-3 rounded-lg bg-white/90 p-1.5 text-[#1c2420] animate-in fade-in slide-in-from-top-3 duration-500">
              <div className="flex items-center justify-between text-[8px] text-[#5c685f]">
                <span className="font-semibold">MEKTEB</span>
                <span>{t("demo_now")}</span>
              </div>
              <div className="mt-0.5 line-clamp-3 text-[9.5px] leading-snug">{pushed}</div>
            </div>
          ) : null}
        </div>
      </div>
    </CursorDemo>
  );
}
