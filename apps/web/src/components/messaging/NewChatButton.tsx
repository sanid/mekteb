"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { PenSquare, X, Search } from "lucide-react";

import { findOrCreateThread } from "@/lib/messaging-actions";

export type ContactRecipient = { id: string; name: string; role: string };

type Props = {
  recipients: ContactRecipient[];
  rolePrefix: "admin" | "teacher" | "examiner" | "parent";
};

export function NewChatButton({ recipients, rolePrefix }: Props) {
  const t = useTranslations("Messaging");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  // Extract locale from path: "/de/admin/..." → "de"
  const locale = pathname.split("/")[1] ?? "de";

  const filtered = recipients.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.role.replace(/_/g, " ").toLowerCase().includes(search.toLowerCase()),
  );

  function handleSelect(recipientId: string) {
    startTransition(async () => {
      const result = await findOrCreateThread(recipientId);
      if ("threadId" in result) {
        setOpen(false);
        setSearch("");
        router.push(`/${locale}/${rolePrefix}/messages/${result.threadId}`);
      }
    });
  }

  function handleOpen() {
    setSearch("");
    setOpen(true);
  }

  return (
    <>
      <button
        onClick={handleOpen}
        title={t("newChat")}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-subtle hover:text-accent"
      >
        <PenSquare className="h-4 w-4" />
      </button>

      {open ? (
        /* Backdrop */
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          {/* Modal */}
          <div
            className="w-full max-w-sm rounded-xl border border-card-border bg-background shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
              <h3 className="font-semibold text-sm">{t("newChat")}</h3>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-accent-subtle hover:text-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-card-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted pointer-events-none" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchContacts")}
                  className="w-full rounded-lg border border-card-border bg-surface pl-8 pr-3 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
                />
              </div>
            </div>

            {/* Contact list */}
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted">
                {t("noContacts")}
              </div>
            ) : (
              <ul className="max-h-64 overflow-y-auto divide-y divide-card-border/60">
                {filtered.map((r) => (
                  <li key={r.id}>
                    <button
                      disabled={isPending}
                      onClick={() => handleSelect(r.id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent-subtle disabled:opacity-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-semibold">
                        {(r.name[0] ?? "—").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{r.name}</div>
                        <div className="text-xs text-muted capitalize">
                          {r.role.replace(/_/g, " ")}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
