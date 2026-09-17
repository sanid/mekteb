"use client";

import dynamic from "next/dynamic";
import type { Block } from "@blocknote/core";

const BlockNoteRenderer = dynamic(() => import("./BlockNoteRenderer"), {
  ssr: false,
  loading: () => (
    <div className="text-sm text-muted animate-pulse">Loading content…</div>
  ),
});

interface DynamicBlockNoteRendererProps {
  blocks: Block[];
  theme?: "light" | "dark";
  className?: string;
}

export function DynamicBlockNoteRenderer({ blocks, theme, className }: DynamicBlockNoteRendererProps) {
  return <BlockNoteRenderer blocks={blocks} theme={theme} className={className} />;
}
