"use client";

import type { Block } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";

interface BlockNoteRendererProps {
  blocks: Block[];
  /** Force a colour scheme; defaults to following the system. */
  theme?: "light" | "dark";
  className?: string;
}

export default function BlockNoteRenderer({ blocks, theme, className }: BlockNoteRendererProps) {
  const editor = useCreateBlockNote({
    initialContent: blocks.length > 0 ? blocks : undefined,
  });

  return (
    <div className={`bn-shadcn [&_.bn-editor]:p-0 [&_.bn-editor]:outline-none ${className ?? ""}`}>
      <BlockNoteView editor={editor} editable={false} theme={theme} />
    </div>
  );
}
