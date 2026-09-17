"use client";

import { useEffect, useRef, useActionState, useOptimistic } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDateShort, formatTime } from "@/lib/format";
import { SendHorizontal } from "lucide-react";

import type { ActionResult } from "@/components/ActionForm";
import { useLiveMessages } from "./use-live-messages";

export type ChatMessage = {
  id: string;
  body: string;
  created_at: string;
  author_profile_id: string | null;
  authorName: string;
};

type Props = {
  messages: ChatMessage[];
  currentUserId: string;
  /** Scopes the live subscription to this conversation. */
  threadId: string;
  sendAction: (formData: FormData) => Promise<ActionResult>;
};

export function ChatWindow({ messages, currentUserId, threadId, sendAction }: Props) {
  // The other side's replies arrive without a reload.
  useLiveMessages(threadId);
  const t = useTranslations("Messaging");
  const locale = useLocale();
  const bottomRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageBodyRef = useRef("");

  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage: ChatMessage) => [...state, newMessage]
  );

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  const [state, formAction, pending] = useActionState(
    async (_: ActionResult, fd: FormData) => {
      const body = String(fd.get("body") ?? "").trim();
      if (body) {
        lastMessageBodyRef.current = body;
        addOptimisticMessage({
          id: Date.now().toString(),
          body,
          created_at: new Date().toISOString(),
          author_profile_id: currentUserId,
          authorName: "Me", // Hidden for current user anyway
        });
        formRef.current?.reset();
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
      return sendAction(fd);
    },
    null,
  );

  // Scroll to bottom when messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [optimisticMessages]);

  // Reset form or restore body if failed
  useEffect(() => {
    if (state) {
      if ("ok" in state && state.ok) {
        textareaRef.current?.focus();
      } else if ("error" in state && state.error && lastMessageBodyRef.current) {
        if (textareaRef.current) {
          textareaRef.current.value = lastMessageBodyRef.current;
          textareaRef.current.focus();
          adjustHeight();
        }
      }
    }
  }, [state]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  // Build message groups with date separators
  type Item =
    | { kind: "date"; label: string; key: string }
    | { kind: "msg"; msg: ChatMessage };

  const items: Item[] = [];
  let lastDateKey = "";
  for (const msg of optimisticMessages) {
    const d = new Date(msg.created_at);
    const dateKey = d.toDateString();
    if (dateKey !== lastDateKey) {
      const todayDate = new Date();
      const today = todayDate.toDateString();
      const yesterdayDate = new Date(todayDate);
      yesterdayDate.setDate(todayDate.getDate() - 1);
      const yesterday = yesterdayDate.toDateString();
      const label =
        dateKey === today
          ? t("today")
          : dateKey === yesterday
            ? t("yesterday")
            : formatDateShort(d, locale);
      items.push({ kind: "date", label, key: dateKey });
      lastDateKey = dateKey;
    }
    items.push({ kind: "msg", msg });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted">{t("emptyThread")}</p>
          </div>
        ) : (
          items.map((item) =>
            item.kind === "date" ? (
              <div key={item.key} className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-card-border" />
                <span className="text-[11px] text-muted shrink-0 font-medium">
                  {item.label}
                </span>
                <div className="flex-1 h-px bg-card-border" />
              </div>
            ) : (
              <MessageBubble
                key={item.msg.id}
                msg={item.msg}
                isMe={item.msg.author_profile_id === currentUserId}
                locale={locale}
              />
            ),
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Send bar */}
      <div className="shrink-0 border-t border-card-border bg-background px-3 py-2">
        {state && "error" in state ? (
          <p className="text-xs text-danger mb-1.5">{state.error}</p>
        ) : null}
        <form ref={formRef} action={formAction} className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            name="body"
            required
            rows={1}
            onChange={adjustHeight}
            onKeyDown={handleKeyDown}
            placeholder={t("typeMessage")}
            className="flex-1 resize-none rounded-xl border border-card-border bg-surface px-3.5 py-2 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20 max-h-28 overflow-y-auto leading-relaxed"
          />
          <button
            type="submit"
            disabled={pending}
            aria-label={t("send")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary-foreground transition-all hover:bg-accent-hover disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ msg, isMe, locale }: { msg: ChatMessage; isMe: boolean; locale: string }) {
  const time = formatTime(msg.created_at, locale);

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className={`max-w-[78%] rounded-xl px-3.5 py-2 ${
          isMe
            ? "bg-accent text-primary-foreground rounded-br-sm"
            : "bg-card border border-card-border rounded-bl-sm"
        }`}
      >
        {!isMe ? (
          <div className="text-[11px] font-semibold opacity-60 mb-0.5 leading-none">
            {msg.authorName}
          </div>
        ) : null}
        <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {msg.body}
        </div>
        <div
          className={`text-[11px] mt-0.5 ${isMe ? "text-white/50" : "text-muted"} text-right leading-none`}
        >
          {time}
        </div>
      </div>
    </div>
  );
}
