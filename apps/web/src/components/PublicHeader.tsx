"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { LogIn } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { MosqueIcon, GithubIcon } from "./icons";

import { buttonVariants } from "@/components/ui/button";
export default function PublicHeader({ hideNavLinks = false }: { hideNavLinks?: boolean }) {
  const t = useTranslations("Index");

  return (
    <header className="sticky top-0 z-30 border-b border-card-border/60 bg-background/85 backdrop-blur-md shadow-sm shadow-accent/2">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-foreground hover:opacity-90 transition-opacity">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/5 border border-accent/15">
            <MosqueIcon className="h-5.5 w-5.5 text-accent" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Mekteb</span>
        </Link>
        {!hideNavLinks && (
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            <Link
              href="/#features"
              className="text-muted hover:text-accent transition-colors duration-200"
            >
              {t("nav_features")}
            </Link>
            <Link
              href="/#how"
              className="text-muted hover:text-accent transition-colors duration-200"
            >
              {t("nav_how")}
            </Link>
            <Link
              href="/#pricing"
              className="text-muted hover:text-accent transition-colors duration-200"
            >
              {t("nav_pricing")}
            </Link>
            <Link
              href="/#faq"
              className="text-muted hover:text-accent transition-colors duration-200"
            >
              {t("nav_faq")}
            </Link>
          </nav>
        )}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          {!hideNavLinks && (
            <a
              href="https://github.com/sanid/mekteb"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="rounded-xl p-2 text-muted hover:text-foreground transition-colors"
            >
              <GithubIcon className="h-5 w-5" />
            </a>
          )}
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <LogIn className="h-3.5 w-3.5" />
            {t("signin")}
          </Link>
        </div>
      </div>
    </header>
  );
}
