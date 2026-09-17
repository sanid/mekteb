"use client";

import { useState, useOptimistic, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";

import { linkParentToStudent, unlinkParentFromStudent } from "./actions";
import { getTranslatedRelation } from "@/lib/relations";
import { tempId } from "@/lib/temp-id";
import { listCard } from "@/components/ui/surfaces";

import { inputCls } from "@/components/FormField";
interface LinkedParent {
  linkId: string;
  parentProfileId: string;
  name: string;
  relation: string | null;
}

interface ParentCandidate {
  id: string;
  name: string;
  relation: string | null;
}

export function LinkedParentsClient({
  studentId,
  initialLinkedParents,
  allParents,
}: {
  studentId: string;
  initialLinkedParents: LinkedParent[];
  allParents: ParentCandidate[];
}) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const [optimisticParents, setOptimisticParents] = useOptimistic(
    initialLinkedParents,
    (
      state,
      action:
        | { type: "link"; parent: LinkedParent }
        | { type: "unlink"; linkId: string },
    ) => {
      switch (action.type) {
        case "link":
          return [...state, action.parent];
        case "unlink":
          return state.filter((p) => p.linkId !== action.linkId);
        default:
          return state;
      }
    },
  );

  const linkedParentIds = new Set(optimisticParents.map((p) => p.parentProfileId));
  const candidateParents = allParents.filter((p) => !linkedParentIds.has(p.id));
  const filteredParents = candidateParents.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectParent = (parentId: string, parentName: string, relation: string | null) => {
    const newLink: LinkedParent = {
      linkId: tempId("link"),
      parentProfileId: parentId,
      name: parentName,
      relation: relation,
    };

    startTransition(async () => {
      setOptimisticParents({ type: "link", parent: newLink });
      const formData = new FormData();
      formData.set("parent_profile_id", parentId);
      const res = await linkParentToStudent(studentId, formData);
      if (res && "error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("parentLinked"));
      }
    });

    setSearchQuery("");
    setIsOpen(false);
  };

  const handleUnlink = (linkId: string) => {
    const formData = new FormData();
    formData.set("link_id", linkId);

    startTransition(async () => {
      setOptimisticParents({ type: "unlink", linkId });
      const res = await unlinkParentFromStudent(formData);
      if (res && "ok" in res) {
        toast.success(t("parentUnlinked"));
      }
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold tracking-tight">{t("linkedParents")}</h2>
      {candidateParents.length > 0 ? (
        <div className="relative rounded-xl border border-card-border bg-card p-4 space-y-2">
          <label className="block text-sm font-medium">{t("linkParent")}</label>
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder={t("selectParent")}
              value={searchQuery}
              onFocus={() => setIsOpen(true)}
              onBlur={() => {
                setTimeout(() => setIsOpen(false), 200);
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              className={inputCls}
            />
            {isOpen && (
              <ul className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-card-border bg-card shadow-lg divide-y divide-card-border">
                {filteredParents.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectParent(p.id, p.name, p.relation);
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-accent-subtle hover:text-accent transition-colors cursor-pointer"
                    >
                      {p.name}
                      {p.relation ? ` (${getTranslatedRelation(p.relation, locale)})` : ""}
                    </button>
                  </li>
                ))}
                {filteredParents.length === 0 && (
                  <li className="px-3.5 py-2.5 text-sm text-muted">
                    {t("noResults")}
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <ul className={listCard}>
        {optimisticParents.map((link) => {
          return (
            <li key={link.linkId} className="flex items-center justify-between gap-4 p-4 bg-card">
              <div>
                <div className="font-medium">{link.name}</div>
                {link.relation ? (
                  <div className="text-sm text-muted">
                    {getTranslatedRelation(link.relation, locale)}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleUnlink(link.linkId)}
                className="text-sm text-danger-fg hover:underline disabled:opacity-50"
              >
                {t("unlink")}
              </button>
            </li>
          );
        })}
        {optimisticParents.length === 0 ? (
          <li className="p-4 text-sm text-muted bg-card">{t("noParents")}</li>
        ) : null}
      </ul>
    </section>
  );
}
