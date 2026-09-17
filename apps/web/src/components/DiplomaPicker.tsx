"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";

type Variant = "clean" | "fancy" | "islamic";

function Thumb({ variant }: { variant: Variant }) {
  // Tiny CSS mockups — not actual PDF previews, just visual cues.
  if (variant === "clean") {
    return (
      <div className="aspect-[1/1.4] w-full rounded-md bg-white border border-card-border p-2 flex flex-col items-center justify-center gap-1">
        <div className="h-1 w-6 rounded-full bg-neutral-300" />
        <div className="h-2 w-12 rounded bg-neutral-900 mt-1" />
        <div className="h-0.5 w-4 bg-info my-0.5" />
        <div className="h-1 w-6 rounded-full bg-neutral-300" />
        <div className="h-3 w-14 rounded bg-neutral-800 mt-2" />
        <div className="h-1 w-8 rounded-full bg-neutral-300 mt-2" />
      </div>
    );
  }
  if (variant === "islamic") {
    return (
      <div className="aspect-[1/1.4] w-full rounded-md bg-warning-subtle border-2 border-success p-1.5 relative flex flex-col items-center justify-center gap-1">
        <div className="absolute top-0.5 left-0.5 h-2.5 w-2.5 border border-warning rotate-45" />
        <div className="absolute top-0.5 right-0.5 h-2.5 w-2.5 border border-warning rotate-45" />
        <div className="absolute bottom-0.5 left-0.5 h-2.5 w-2.5 border border-warning rotate-45" />
        <div className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 border border-warning rotate-45" />
        <div className="absolute inset-1 border border-warning/40 rounded-sm" />
        <div className="h-1 w-4 rounded bg-warning z-10" />
        <div className="h-2.5 w-12 rounded bg-success z-10" />
        <div className="h-0.5 w-8 bg-warning z-10" />
        <div className="h-2.5 w-10 rounded bg-neutral-900 z-10 mt-1" />
      </div>
    );
  }
  // fancy
  return (
    <div className="aspect-[1/1.4] w-full rounded-md bg-white border-[3px] border-info p-1 flex">
      <div className="flex-1 border border-info/60 p-2 flex flex-col items-center justify-center gap-1">
        <div className="h-1 w-6 rounded-full bg-info-subtle" />
        <div className="h-2.5 w-14 rounded bg-info" />
        <div className="h-1 w-8 rounded-full bg-neutral-400 my-1" />
        <div className="h-2.5 w-12 rounded bg-neutral-900 border-b border-info" />
        <div className="h-1 w-10 rounded-full bg-info-subtle mt-2" />
      </div>
    </div>
  );
}

const PANEL_WIDTH = 420;
/** Breathing room kept between the panel and the edge it is measured against. */
const GUTTER = 8;

/**
 * The nearest ancestor that would clip the panel, as a viewport rect.
 *
 * `PortalShell` renders pages inside `<main class="overflow-y-auto">`, and CSS
 * computes `overflow-x: visible` to `auto` whenever the other axis scrolls — so
 * that `<main>` clips, and a right-aligned 420px panel next to a button near
 * the left of the content column got sliced off at the sidebar.
 */
function clipRect(el: HTMLElement): DOMRect {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(node);
    if (overflowX !== "visible" || overflowY !== "visible") return node.getBoundingClientRect();
  }
  return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
}

export default function DiplomaPicker({
  sessionId,
  label,
  basePath = "/examiner/exams",
}: {
  sessionId: string;
  label: string;
  basePath?: string;
}) {
  const t = useTranslations("Examiner");
  const [open, setOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [alignLeft, setAlignLeft] = useState(false);
  const [maxWidth, setMaxWidth] = useState(PANEL_WIDTH);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const open_ = (variant: Variant) => {
    window.open(`${basePath}/${sessionId}/diploma?design=${variant}`, "_blank", "noopener");
    setOpen(false);
  };

  const variants: { id: Variant; label: string }[] = [
    { id: "clean", label: t("diplomaClean") },
    { id: "fancy", label: t("diplomaFancy") },
    { id: "islamic", label: t("diplomaIslamic") },
  ];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setOpenUpwards(spaceBelow < 220 && rect.top > 220);

            // Right-aligned by default; the panel grows leftwards from the
            // button. Flip to left-aligned when that would run past the
            // clipping edge, and shrink only if neither side has room.
            const clip = clipRect(ref.current);
            const roomLeftwards = rect.right - clip.left - GUTTER;
            const roomRightwards = clip.right - rect.left - GUTTER;
            const flip = roomLeftwards < PANEL_WIDTH && roomRightwards > roomLeftwards;
            setAlignLeft(flip);
            setMaxWidth(Math.min(PANEL_WIDTH, Math.max(flip ? roomRightwards : roomLeftwards, 0)));
          }
          setOpen((v) => !v);
        }}
        className={buttonVariants({ size: "sm" })}
      >
        {label}
      </button>

      {open ? (
        <div
          style={{ width: maxWidth }}
          className={`absolute z-20 rounded-xl border border-card-border bg-card shadow-lg p-3 ${alignLeft ? "left-0" : "right-0"} ${openUpwards ? "bottom-full mb-2" : "top-full mt-2"}`}
        >
          <div className="text-xs font-semibold text-muted mb-2 px-1">
            {t("diplomaChooseDesign")}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => open_(v.id)}
                className="group flex flex-col items-stretch gap-1.5 rounded-lg p-2 text-left transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <Thumb variant={v.id} />
                <span className="text-xs font-medium text-center group-hover:text-accent">
                  {v.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
