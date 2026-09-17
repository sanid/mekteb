"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Search, UserPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

interface Item {
  id: string;
  label: string;
}

interface MultiSelectListProps {
  /** All candidates (not yet enrolled/assigned). */
  items: Item[];
  /** Input name used for FormData — each selected id is appended. */
  name: string;
  /** The server action to call on submit. */
  action: (fd: FormData) => Promise<unknown>;
  /** Label shown inside the submit button. */
  submitLabel: string;
  /** Placeholder for the search input. */
  searchPlaceholder?: string;
  /** Toast-style success callback. */
  onSuccess?: () => void;
}

export function MultiSelectList({
  items,
  name,
  action,
  submitLabel,
  searchPlaceholder = "Suchen…",
}: MultiSelectListProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const filtered = query.trim()
    ? items.filter((i) =>
        i.label.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : items;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map((i) => i.id)));
  }
  function clearAll() {
    setSelected(new Set());
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) return;
    const fd = new FormData();
    for (const id of selected) fd.append(name, id);
    startTransition(async () => {
      await action(fd);
      setSelected(new Set());
      setQuery("");
    });
  }

  if (items.length === 0) return null;

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-card-border bg-background pl-9 pr-3 py-2.5 text-sm placeholder:text-muted focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
        />
      </div>

      {/* Select all / clear row */}
      {filtered.length > 1 && (
        <div className="flex items-center justify-between text-xs text-muted px-0.5">
          <span>
            {selected.size > 0
              ? `${selected.size} ausgewählt`
              : "Keiner ausgewählt"}
          </span>
          <div className="flex gap-3">
            {selected.size < filtered.length && (
              <button
                type="button"
                onClick={selectAll}
                className="hover:text-foreground transition-colors"
              >
                Alle auswählen
              </button>
            )}
            {selected.size > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="hover:text-foreground transition-colors"
              >
                Auswahl aufheben
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable checkbox list */}
      <div className="max-h-48 overflow-y-auto rounded-xl border border-card-border divide-y divide-card-border">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-muted text-center">Keine Ergebnisse</p>
        ) : (
          filtered.map((item) => {
            const checked = selected.has(item.id);
            return (
              <label
                key={item.id}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors select-none ${
                  checked ? "bg-accent-subtle" : "hover:bg-surface"
                }`}
              >
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    checked
                      ? "border-accent bg-accent text-primary-foreground"
                      : "border-card-border bg-background"
                  }`}
                >
                  {checked && (
                    <svg
                      viewBox="0 0 12 12"
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggle(item.id)}
                />
                <span className="text-sm">{item.label}</span>
              </label>
            );
          })
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={selected.size === 0 || isPending}
        className={buttonVariants({ size: "xl" })}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        {submitLabel}
        {selected.size > 0 && !isPending && (
          <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-medium">
            {selected.size}
          </span>
        )}
      </button>
    </form>
  );
}
