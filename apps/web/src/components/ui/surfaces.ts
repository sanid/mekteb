/**
 * Named class strings for the recurring surface shapes.
 *
 * These were copy-pasted literals: the list-card string appeared 61 times,
 * the padded card 30+, and the dashed empty state 4 — with a `rounded-xl` /
 * `rounded-2xl` split between otherwise identical list cards, so the corner
 * radius visibly disagreed between screens.
 *
 * `cn()` them with anything extra rather than re-typing the base:
 *   <ul className={cn(listCard, "bg-card")}>
 *
 * Form controls live in `@/components/FormField` (`inputCls`, `selectCls`) —
 * this file is only for containers.
 */

/** Bordered container whose children are separated by rules — lists, tables. */
export const listCard =
  "divide-y divide-card-border rounded-xl border border-card-border overflow-hidden";

/** Bordered container with no internal dividers — wraps a single block. */
export const panelCard = "rounded-xl border border-card-border overflow-hidden";

/** Padded content card. The default surface for a titled block of content. */
export const contentCard = "rounded-xl border border-card-border bg-card p-5";

/** Placeholder shown where content would be, but there is none yet. */
export const emptyCard =
  "rounded-xl border border-dashed border-card-border p-10 text-center text-sm text-muted bg-card/30";
