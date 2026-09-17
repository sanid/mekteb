import { notFound } from "next/navigation";
import { redirect } from "@/i18n/routing";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, BookOpen } from "lucide-react";

import { getLibraryBase, getPublicLibrary } from "@/lib/public-library";
import { LibraryLink } from "./LibraryLink";

export default async function PublicLibraryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const library = await getPublicLibrary(slug, locale);
  if (!library) notFound();
  const t = await getTranslations("PublicLibrary");
  const base = await getLibraryBase(slug);
  // A language nothing is translated into: show the original instead.
  if (!library.locales.includes(locale)) {
    redirect({ href: base || "/", locale: library.baseLocale });
  }
  const lessonCount = library.topics.reduce((n, topic) => n + topic.lessons.length, 0);

  return (
    <div className="max-w-3xl space-y-10">
      <section className="relative overflow-hidden rounded-2xl border border-card-border bg-card p-6 sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent opacity-10 blur-2xl"
        />
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{library.title}</h1>
        {library.intro ? (
          <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-muted">{library.intro}</p>
        ) : null}
        <p className="mt-6 text-sm text-muted">
          {t("stats", { topics: library.topics.filter((x) => x.id).length, lessons: lessonCount })}
        </p>
      </section>

      {library.topics.length === 0 ? (
        <p className="text-muted">{t("empty")}</p>
      ) : (
        library.topics.map((topic) => (
          <section key={topic.id ?? "loose"} className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{topic.title || t("otherLessons")}</h2>
              {topic.description ? <p className="mt-1 text-sm text-muted">{topic.description}</p> : null}
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {topic.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <LibraryLink
                    base={base}
                    href={`${base}/${lesson.id}`}
                    className="group flex h-full items-center gap-3 rounded-xl border border-card-border bg-card p-4 transition-colors hover:border-accent/40 hover:bg-accent-subtle"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 font-medium">{lesson.title}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </LibraryLink>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
