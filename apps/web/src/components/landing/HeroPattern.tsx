"use client";

import { useEffect, useRef } from "react";

/**
 * An eight-point star (khatam) tile, the pattern found in mosque tilework and
 * mashrabiya screens. Two overlapping squares per cell plus the lines that
 * connect neighbouring stars, drawn as a single stroked path.
 */
const TILE = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none" stroke="black" stroke-width="1.2">
    <rect x="28" y="28" width="40" height="40"/>
    <rect x="28" y="28" width="40" height="40" transform="rotate(45 48 48)"/>
    <path d="M48 0v20M48 76v20M0 48h20M76 48h20M0 0l19.7 19.7M96 0L76.3 19.7M0 96l19.7-19.7M96 96L76.3 76.3"/>
    <circle cx="48" cy="48" r="9"/>
  </svg>`,
);
const PATTERN = `url("data:image/svg+xml,${TILE}")`;

/**
 * Hero background: the star pattern, barely visible everywhere and lit up in
 * a soft circle that follows the pointer. With no pointer (touch, or before
 * the mouse moves) the light drifts slowly on its own, and the whole tiling
 * creeps diagonally so the section never sits completely still.
 */
export function HeroPattern() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const section = el?.parentElement;
    if (!el || !section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let target = { x: 0.7, y: 0.35 };
    const current = { ...target };
    let lastPointer = 0;
    let frame = 0;

    const onMove = (e: PointerEvent) => {
      const r = section.getBoundingClientRect();
      target = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
      lastPointer = performance.now();
    };

    const tick = (now: number) => {
      if (now - lastPointer > 2500) {
        // Idle: a slow figure-eight across the right half of the hero.
        const t = now / 6000;
        target = { x: 0.62 + Math.sin(t) * 0.25, y: 0.45 + Math.sin(t * 2) * 0.25 };
      }
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;
      el.style.setProperty("--spot-x", `${current.x * 100}%`);
      el.style.setProperty("--spot-y", `${current.y * 100}%`);
      el.style.setProperty("--shift", `${(now / 120) % 96}px`);
      frame = requestAnimationFrame(tick);
    };

    section.addEventListener("pointermove", onMove);
    frame = requestAnimationFrame(tick);
    return () => {
      section.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  const tile = {
    maskImage: PATTERN,
    WebkitMaskImage: PATTERN,
    maskSize: "96px 96px",
    WebkitMaskSize: "96px 96px",
    maskPosition: "var(--shift) var(--shift)",
    WebkitMaskPosition: "var(--shift) var(--shift)",
  } as React.CSSProperties;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ "--spot-x": "70%", "--spot-y": "35%", "--shift": "0px" } as React.CSSProperties}
    >
      {/* Faint base layer, fading out toward the bottom edge */}
      <div
        className="absolute inset-0 [mask-composite:intersect] bg-foreground opacity-[0.05] dark:opacity-[0.07]"
        style={{
          ...tile,
          maskImage: `${PATTERN}, linear-gradient(to bottom, black 55%, transparent)`,
          WebkitMaskImage: `${PATTERN}, linear-gradient(to bottom, black 55%, transparent)`,
          maskSize: "96px 96px, 100% 100%",
          WebkitMaskSize: "96px 96px, 100% 100%",
          maskPosition: "var(--shift) var(--shift), 0 0",
          WebkitMaskPosition: "var(--shift) var(--shift), 0 0",
          maskRepeat: "repeat, no-repeat",
          WebkitMaskRepeat: "repeat, no-repeat",
          WebkitMaskComposite: "source-in",
        } as React.CSSProperties}
      />
      {/* The lit circle */}
      <div
        className="absolute inset-0 bg-accent opacity-50 [mask-composite:intersect]"
        style={{
          ...tile,
          maskImage: `${PATTERN}, radial-gradient(260px circle at var(--spot-x) var(--spot-y), black, transparent)`,
          WebkitMaskImage: `${PATTERN}, radial-gradient(260px circle at var(--spot-x) var(--spot-y), black, transparent)`,
          maskSize: "96px 96px, 100% 100%",
          WebkitMaskSize: "96px 96px, 100% 100%",
          maskPosition: "var(--shift) var(--shift), 0 0",
          WebkitMaskPosition: "var(--shift) var(--shift), 0 0",
          maskRepeat: "repeat, no-repeat",
          WebkitMaskRepeat: "repeat, no-repeat",
          WebkitMaskComposite: "source-in",
        } as React.CSSProperties}
      />
    </div>
  );
}
