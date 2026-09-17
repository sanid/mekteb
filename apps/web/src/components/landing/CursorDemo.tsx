"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One scripted move of the fake cursor. `target` is the `data-demo` value of
 * the element to glide to and click; `type` types into the focused field one
 * character at a time instead of clicking.
 */
export type DemoStep = {
  target?: string;
  run?: () => void;
  type?: { text: string; onChange: (value: string) => void };
  /** Pause after the step, in ms. */
  wait?: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * A product demo driven by a fake mouse pointer.
 *
 * Plays once it scrolls into view and loops. The moment the visitor clicks
 * inside, the script stops and the controls are theirs; a replay button brings
 * the animation back. With reduced motion it never autoplays.
 */
export function CursorDemo({
  steps,
  reset,
  replayLabel,
  className,
  children,
}: {
  steps: DemoStep[];
  reset: () => void;
  replayLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [pressing, setPressing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [cursorShown, setCursorShown] = useState(false);
  // Steps close over fresh setters each render; the loop reads the latest.
  const stepsRef = useRef(steps);
  const resetRef = useRef(reset);
  useEffect(() => {
    stepsRef.current = steps;
    resetRef.current = reset;
  });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (reduced) setMode("manual");
      else setVisible(e.isIntersecting);
    }, {
      threshold: 0.35,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (mode !== "auto" || !visible) return;
    let cancelled = false;

    const moveTo = (name: string) => {
      const stage = stageRef.current;
      const el = stage?.querySelector<HTMLElement>(`[data-demo="${name}"]`);
      if (!stage || !el) return;
      const s = stage.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setPos({ x: r.left - s.left + r.width * 0.55, y: r.top - s.top + r.height * 0.6 });
    };

    (async () => {
      while (!cancelled) {
        resetRef.current();
        setPos({ x: (stageRef.current?.offsetWidth ?? 300) * 0.8, y: (stageRef.current?.offsetHeight ?? 300) + 20 });
        setCursorShown(true);
        await sleep(700);
        for (const step of stepsRef.current) {
          if (cancelled) return;
          if (step.target) {
            moveTo(step.target);
            await sleep(650);
            if (cancelled) return;
            setPressing(true);
            await sleep(120);
            step.run?.();
            setPressing(false);
          }
          if (step.type) {
            for (let i = 1; i <= step.type.text.length; i++) {
              if (cancelled) return;
              step.type.onChange(step.type.text.slice(0, i));
              await sleep(28);
            }
          }
          await sleep(step.wait ?? 280);
        }
        await sleep(2600);
      }
    })();

    return () => {
      cancelled = true;
      setPressing(false);
    };
  }, [mode, visible]);

  const takeOver = useCallback(() => {
    if (mode === "auto") {
      setMode("manual");
      setCursorShown(false);
    }
  }, [mode]);

  return (
    <div
      ref={stageRef}
      onPointerDownCapture={takeOver}
      className={cn("relative select-none", className)}
    >
      {children}

      {mode === "auto" && cursorShown ? (
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-20 transition-transform duration-[650ms] ease-[cubic-bezier(.45,0,.2,1)]"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
        >
          <span
            className={cn(
              "absolute -left-3 -top-3 h-6 w-6 rounded-full bg-foreground/15 transition-all duration-150",
              pressing ? "scale-100 opacity-100" : "scale-50 opacity-0",
            )}
          />
          <svg
            viewBox="0 0 20 22"
            className={cn("h-5 w-5 drop-shadow-md transition-transform duration-100", pressing && "scale-90")}
          >
            <path
              d="M2 1.5v16.2l4.3-3.9 2.8 6.3 3-1.3-2.8-6.2h5.9z"
              className="fill-foreground stroke-background"
              strokeWidth={1.4}
              strokeLinejoin="round"
            />
          </svg>
        </div>
      ) : null}

      {mode === "manual" ? (
        <button
          type="button"
          onClick={() => {
            resetRef.current();
            setMode("auto");
          }}
          className="absolute bottom-3 right-3 z-20 inline-flex h-8 items-center gap-1.5 rounded-md border border-card-border bg-card px-2.5 text-xs font-medium text-muted shadow-elevated hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {replayLabel}
        </button>
      ) : null}
    </div>
  );
}
