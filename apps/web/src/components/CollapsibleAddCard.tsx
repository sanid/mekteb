"use client";

import { useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Wraps an "add form" so it's collapsed by default behind a button.
 * Children are typically a <FormCard>…</FormCard> block.
 *
 * Note: this does NOT auto-close on submit (it can't know when a server
 * action finishes). If you need close-on-success, manage `useState`
 * yourself in a client component and use the same button pattern.
 */
export function CollapsibleAddCard({
  buttonLabel,
  children,
  defaultOpen = false,
  className,
}: {
  buttonLabel: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const t = useTranslations("Admin");

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={buttonVariants({ size: "sm" })}
        >
          {open ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {open ? t("cancel") : buttonLabel}
        </button>
      </div>
      {open ? children : null}
    </div>
  );
}
