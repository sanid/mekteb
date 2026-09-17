import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Consistent input / textarea / select class shared across all forms. */
export const inputCls = cn(
  "w-full rounded-lg border border-card-border bg-background",
  "px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted",
  "transition-colors focus:border-accent focus:outline-none",
  "focus:ring-3 focus:ring-accent/20",
  "aria-invalid:border-danger aria-invalid:ring-danger/20",
  "disabled:opacity-50 disabled:cursor-not-allowed",
);

/** Same but for <select> — keeps consistent look. */
export const selectCls = cn(inputCls, "cursor-pointer");

interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/**
 * Wraps a single form control with a label, optional hint, and error message.
 * Children should be a single <input>, <textarea>, or <select>.
 */
export function FormField({
  label,
  required,
  hint,
  error,
  children,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="text-accent" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface FormCardProps {
  children: ReactNode;
  /** Optional accent-colored title strip at the top. */
  title?: string;
  description?: string;
  className?: string;
}

/**
 * Styled card container for forms.
 * Has a thin accent top-border and comfortable padding.
 */
export function FormCard({
  children,
  title,
  description,
  className,
}: FormCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-card-border bg-card overflow-hidden",
        className,
      )}
    >
      {/* accent top-bar */}
      <div className="h-1 w-full bg-gradient-to-r from-accent/60 to-accent/20" />

      <div className="p-6 space-y-5">
        {(title || description) && (
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted">{description}</p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
