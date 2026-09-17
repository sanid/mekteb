import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import { MosqueIcon } from "@/components/icons";
import { getLibraryBase, getPublicLibrary } from "@/lib/public-library";
import { cn } from "@/lib/utils";

import { LibrarySidebar } from "./LibrarySidebar";
import { LibraryLink } from "./LibraryLink";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const library = await getPublicLibrary(slug, await getLocale());
  if (!library) return {};
  return {
    title: library.title,
    description: library.intro ?? undefined,
  };
}

export default async function PublicLibraryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const library = await getPublicLibrary(slug, await getLocale());
  if (!library) notFound();
  const t = await getTranslations("PublicLibrary");
  const base = await getLibraryBase(slug);

  const style = library.accentColor
    ? ({ "--primary": library.accentColor, "--accent": library.accentColor, "--ring": library.accentColor } as React.CSSProperties)
    : undefined;

  return (
    <div
      style={style}
      className={cn(
        "flex min-h-screen flex-1 flex-col bg-background text-foreground",
        library.theme === "dark" && "dark",
        library.theme === "light" && "library-theme-light",
        library.theme === "sepia" && "library-theme-sepia",
        library.font === "serif" && "library-font-serif",
        library.font === "rounded" && "library-font-rounded",
      )}
    >
      <header className="sticky top-0 z-30 border-b border-card-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <LibraryLink base={base} href={base || "/"} className="flex min-w-0 items-center gap-2.5">
            {library.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={library.logoUrl} alt="" className="h-9 w-auto max-w-[120px] object-contain" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent-subtle">
                <MosqueIcon className="h-5 w-5 text-accent" />
              </span>
            )}
            <span className="truncate text-base font-semibold tracking-tight sm:text-lg">{library.title}</span>
          </LibraryLink>
          <div className="flex shrink-0 items-center gap-2">
            {library.locales.length > 1 ? (
              <div className="w-28">
                <LanguageSwitcher fullReload={base === ""} locales={library.locales} />
              </div>
            ) : null}
            {library.theme === "system" ? <ThemeToggle /> : null}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-10 lg:py-10">
        <div className="lg:contents">
          <LibrarySidebar
            base={base}
            topics={library.topics}
            labels={{
              overview: t("overview"),
              contents: t("contents"),
              otherLessons: t("otherLessons"),
              openMenu: t("openMenu"),
              closeMenu: t("closeMenu"),
            }}
          />
        </div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <footer className="border-t border-card-border/70 py-6 text-center text-xs text-muted">
        {t("poweredBy", { mosque: library.mosque.name })}
      </footer>
    </div>
  );
}
