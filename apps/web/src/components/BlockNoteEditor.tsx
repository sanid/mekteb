"use client";

import { useRef } from "react";
import type { Block } from "@blocknote/core";
import { en, de, hr } from "@blocknote/core/locales";
import { useCreateBlockNote, useEditorChange } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";

import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeProvider";

const BUCKET = "lesson-images";

// Map our app locales to BlockNote dictionaries. BlockNote doesn't ship
// bs/tr, so fall back to the nearest neighbour (hr for bs, en for tr).
function pickDictionary(locale?: string) {
  switch (locale) {
    case "de":
      return de;
    case "bs":
      return hr;
    case "en":
    case "tr":
    default:
      return en;
  }
}

interface BlockNoteEditorProps {
  name: string;
  initialContent?: Block[];
  locale?: string;
  mosqueId?: string;
  lessonId?: string;
}

export default function BlockNoteEditor({
  name,
  initialContent,
  locale,
  mosqueId,
  lessonId,
}: BlockNoteEditorProps) {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();

  async function uploadFile(file: File): Promise<string> {
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "bin";
    const path = [
      mosqueId ?? "shared",
      lessonId ?? "unknown",
      `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`,
    ].join("/");

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  const editor = useCreateBlockNote({
    initialContent,
    uploadFile,
    dictionary: pickDictionary(locale),
  });

  useEditorChange((editor) => {
    if (hiddenRef.current) {
      hiddenRef.current.value = JSON.stringify(editor.document);
    }
  }, editor);

  function focusEditor() {
    editor.focus();
  }

  return (
    <>
      <input
        ref={hiddenRef}
        type="hidden"
        name={name}
        defaultValue={
          initialContent ? JSON.stringify(initialContent) : "[]"
        }
      />
      <div
        onClick={focusEditor}
        className={[
          "rounded-lg border border-card-border bg-background overflow-hidden",
          "min-h-[400px] flex flex-col cursor-text",
          "[&_.bn-container]:flex-1 [&_.bn-container]:flex [&_.bn-container]:flex-col [&_.bn-container]:min-h-0",
          "[&_.bn-editor]:flex-1 [&_.bn-editor]:min-h-0 [&_.bn-editor]:py-3",
        ].join(" ")}
      >
        <BlockNoteView editor={editor} theme={theme} />
      </div>
    </>
  );
}
