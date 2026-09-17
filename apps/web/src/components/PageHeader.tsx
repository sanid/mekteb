import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { Link } from "@/i18n/routing";

export type Crumb = { href?: string; label: string };

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  icon,
}: {
  title: ReactNode;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <header className="space-y-2 border-b border-card-border pb-5">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
            {breadcrumbs.map((c, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <li key={`${c.label}-${i}`} className="flex items-center gap-1">
                  {c.href && !isLast ? (
                    <Link
                      href={c.href}
                      prefetch={true}
                      className="hover:text-foreground transition-colors"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span className={isLast ? "text-foreground" : ""}>{c.label}</span>
                  )}
                  {!isLast && <ChevronRight className="h-3 w-3" />}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight truncate">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-muted">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/**
 * Heading for a block inside a page — one size everywhere (16/semibold) so
 * sections don't drift between text-sm and text-lg from screen to screen.
 */
export function SectionHeader({
  title,
  icon,
  actions,
}: {
  title: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight [&_svg]:size-4 [&_svg]:text-muted">
        {icon}
        {title}
      </h2>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
