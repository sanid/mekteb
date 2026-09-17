"use client";

import dynamic from "next/dynamic";
import type { Block } from "@blocknote/core";

const BlockNoteEditor = dynamic(() => import("./BlockNoteEditor"), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-card-border bg-background p-8 text-sm text-muted animate-pulse">
      Loading editor…
    </div>
  ),
});

interface DynamicBlockNoteEditorProps {
  name: string;
  initialContent?: Block[];
  locale?: string;
  mosqueId?: string;
  lessonId?: string;
}

export function DynamicBlockNoteEditor({
  name,
  initialContent,
  locale,
  mosqueId,
  lessonId,
}: DynamicBlockNoteEditorProps) {
  return (
    <BlockNoteEditor
      name={name}
      initialContent={initialContent}
      locale={locale}
      mosqueId={mosqueId}
      lessonId={lessonId}
    />
  );
}
