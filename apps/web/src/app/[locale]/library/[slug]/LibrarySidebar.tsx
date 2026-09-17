"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, Menu, X } from "lucide-react";

import { usePathname } from "@/i18n/routing";
import type { PublicLibraryTopic } from "@/lib/public-library";
import { cn } from "@/lib/utils";
import { LibraryLink } from "./LibraryLink";

export function LibrarySidebar({
  base,
  topics,
  labels,
}: {
  /** "" on a library subdomain, otherwise /library/{slug}. */
  base: string;
  topics: PublicLibraryTopic[];
  labels: { overview: string; contents: string; otherLessons: string; openMenu: string; closeMenu: string };
}) {
  const pathname = usePathname();
  // The drawer remembers the path it was opened on, so navigating closes it.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const setOpen = (value: boolean) => setOpenedAt(value ? pathname : null);
  const activeLessonId = pathname.slice(base.length).split("/")[1] || null;

  const nav = (
    <nav className="space-y-1 text-sm">
      <LibraryLink
        base={base}
        href={base || "/"}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition-colors",
          !activeLessonId ? "bg-accent-subtle text-accent" : "text-muted hover:bg-accent-subtle hover:text-foreground",
        )}
      >
        <BookOpen className="h-4 w-4" />
        {labels.overview}
      </LibraryLink>
      <div className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {labels.contents}
      </div>
      {topics.map((topic) => (
        <TopicGroup
          key={topic.id ?? "loose"}
          topic={topic}
          fallbackTitle={labels.otherLessons}
          base={base}
          activeLessonId={activeLessonId}
        />
      ))}
    </nav>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={labels.openMenu}
        className="lg:hidden inline-flex h-9 items-center gap-2 rounded-lg border border-card-border bg-card px-3 text-sm font-medium"
      >
        <Menu className="h-4 w-4" />
        {labels.contents}
      </button>

      {/* Desktop */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 pb-8">{nav}</div>
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label={labels.closeMenu}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-xs overflow-y-auto bg-background p-4 shadow-xl">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={labels.closeMenu}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-card-border"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      ) : null}
    </>
  );
}

function TopicGroup({
  topic,
  fallbackTitle,
  base,
  activeLessonId,
}: {
  topic: PublicLibraryTopic;
  fallbackTitle: string;
  base: string;
  activeLessonId: string | null;
}) {
  const containsActive = topic.lessons.some((l) => l.id === activeLessonId);
  const [expanded, setExpanded] = useState(true);
  const isOpen = expanded || containsActive;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left font-semibold hover:bg-accent-subtle"
      >
        <span className="min-w-0 truncate">{topic.title || fallbackTitle}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform", !isOpen && "-rotate-90")} />
      </button>
      {isOpen ? (
        <ul className="ml-3 mb-2 border-l border-card-border">
          {topic.lessons.map((lesson) => {
            const active = lesson.id === activeLessonId;
            return (
              <li key={lesson.id}>
                <LibraryLink
                  base={base}
                  href={`${base}/${lesson.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "-ml-px block border-l-2 py-1.5 pl-3 pr-2 transition-colors",
                    active
                      ? "border-accent font-medium text-accent"
                      : "border-transparent text-muted hover:border-card-border hover:text-foreground",
                  )}
                >
                  {lesson.title}
                </LibraryLink>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
