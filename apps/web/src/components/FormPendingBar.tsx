"use client";

import { useFormStatus } from "react-dom";

/**
 * Thin indeterminate progress bar pinned to the top edge of a form card while
 * its action runs (including the redirect render that follows a sign-in).
 * Place it as the first child of a `relative overflow-hidden` form.
 */
export function FormPendingBar() {
  const { pending } = useFormStatus();
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden transition-opacity duration-200 ${pending ? "opacity-100" : "opacity-0"}`}
    >
      <div className="h-full w-1/3 animate-[form-pending_1.1s_ease-in-out_infinite] rounded-full bg-accent" />
    </div>
  );
}
