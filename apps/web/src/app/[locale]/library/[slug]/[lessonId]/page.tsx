import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/routing";
import { getLocale, getTranslations } from "next-intl/server";
import type { Block } from "@blocknote/core";
import { ArrowLeft, ArrowRight, Download, FileText, Headphones } from "lucide-react";

import { DynamicBlockNoteRenderer } from "@/components/DynamicBlockNoteRenderer";
import { getLibraryBase, getPublicLesson, getPublicLibrary } from "@/lib/public-library";
import { LibraryLink } from "../LibraryLink";

type Params = Promise<{ slug: string; lessonId: string }>;

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, lessonId } = await params;
  const locale = await getLocale();
  const library = await getPublicLibrary(slug, locale);
  const lesson = library?.topics.flatMap((t) => t.lessons).find((l) => l.id === lessonId);
  return lesson && library ? { title: `${lesson.title} · ${library.title}` } : {};
}

export default async function PublicLessonPage({ params }: { params: Params }) {
  const { slug, lessonId } = await params;
  const locale = await getLocale();
  const library = await getPublicLibrary(slug, locale);
  if (!library) notFound();
  const base = await getLibraryBase(slug);
  // A language nothing is translated into: show the original instead.
  if (!library.locales.includes(locale)) {
    redirect({ href: `${base}/${lessonId}`, locale: library.baseLocale });
  }
  const lesson = await getPublicLesson(library, lessonId, locale);
  if (!lesson) notFound();
  const t = await getTranslations("PublicLibrary");

  const topic = library.topics.find((x) => x.lessons.some((l) => l.id === lessonId));
  const all = library.topics.flatMap((x) => x.lessons);
  const index = all.findIndex((l) => l.id === lessonId);
  const prev = index > 0 ? all[index - 1] : null;
  const next = index < all.length - 1 ? all[index + 1] : null;

  return (
    <article className="max-w-3xl space-y-8">
      <header className="space-y-2">
        {topic ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            {topic.title || t("otherLessons")}
          </p>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{lesson.title}</h1>
      </header>

      {lesson.audio.length > 0 ? (
        <section className="space-y-3 rounded-2xl border border-card-border bg-card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Headphones className="h-4 w-4 text-accent" />
            {t("listen")}
          </h2>
          {lesson.audio.map((a) => (
            <div key={a.id} className="space-y-1.5">
              {lesson.audio.length > 1 || a.title !== lesson.title ? (
                <div className="text-sm text-muted">{a.title}</div>
              ) : null}
              <audio controls preload="metadata" className="w-full">
                <source src={a.url!} type={a.mimeType ?? undefined} />
              </audio>
            </div>
          ))}
        </section>
      ) : null}

      {lesson.body.length > 0 ? (
        <div className="library-lesson-body text-[1.0625rem] leading-relaxed">
          <DynamicBlockNoteRenderer
            blocks={lesson.body as unknown as Block[]}
            theme={library.theme === "system" ? undefined : library.theme === "dark" ? "dark" : "light"}
            className="[&_.bn-container]:bg-transparent [&_.bn-editor]:bg-transparent [&_.bn-editor]:text-foreground"
          />
        </div>
      ) : null}

      {lesson.resources.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{t("materials")}</h2>
          <ul className="divide-y divide-card-border overflow-hidden rounded-xl border border-card-border bg-card">
            {lesson.resources.map((r) => (
              <li key={r.id}>
                <a
                  href={r.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-accent-subtle"
                >
                  <FileText className="h-5 w-5 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.title}</span>
                    <span className="block text-xs text-muted">{formatBytes(r.sizeBytes)}</span>
                  </span>
                  <Download className="h-4 w-4 shrink-0 text-accent" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav className="grid gap-3 border-t border-card-border pt-6 sm:grid-cols-2">
        {prev ? (
          <LibraryLink
            base={base}
            href={`${base}/${prev.id}`}
            className="group rounded-xl border border-card-border p-4 transition-colors hover:border-accent/40"
          >
            <span className="flex items-center gap-1 text-xs text-muted">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("previous")}
            </span>
            <span className="mt-1 block font-medium group-hover:text-accent">{prev.title}</span>
          </LibraryLink>
        ) : (
          <span />
        )}
        {next ? (
          <LibraryLink
            base={base}
            href={`${base}/${next.id}`}
            className="group rounded-xl border border-card-border p-4 text-right transition-colors hover:border-accent/40"
          >
            <span className="flex items-center justify-end gap-1 text-xs text-muted">
              {t("next")}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <span className="mt-1 block font-medium group-hover:text-accent">{next.title}</span>
          </LibraryLink>
        ) : null}
      </nav>
    </article>
  );
}
