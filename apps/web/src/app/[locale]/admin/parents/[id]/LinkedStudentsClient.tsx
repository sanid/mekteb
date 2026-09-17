"use client";

import { useState, useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { linkStudentToParent, unlinkStudentFromParent } from "./actions";
import { tempId } from "@/lib/temp-id";
import { listCard } from "@/components/ui/surfaces";

import { inputCls } from "@/components/FormField";
interface LinkedStudent {
  linkId: string;
  studentProfileId: string;
  name: string;
}

interface StudentCandidate {
  id: string;
  name: string;
}

export function LinkedStudentsClient({
  parentId,
  initialLinkedStudents,
  allStudents,
}: {
  parentId: string;
  initialLinkedStudents: LinkedStudent[];
  allStudents: StudentCandidate[];
}) {
  const t = useTranslations("Admin");
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const [optimisticStudents, setOptimisticStudents] = useOptimistic(
    initialLinkedStudents,
    (
      state,
      action:
        | { type: "link"; student: LinkedStudent }
        | { type: "unlink"; linkId: string },
    ) => {
      switch (action.type) {
        case "link":
          return [...state, action.student];
        case "unlink":
          return state.filter((s) => s.linkId !== action.linkId);
        default:
          return state;
      }
    },
  );

  const linkedStudentIds = new Set(optimisticStudents.map((s) => s.studentProfileId));
  const candidateStudents = allStudents.filter((s) => !linkedStudentIds.has(s.id));
  const filteredStudents = candidateStudents.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectStudent = (studentId: string, studentName: string) => {
    const newLink: LinkedStudent = {
      linkId: tempId("link"),
      studentProfileId: studentId,
      name: studentName,
    };

    startTransition(async () => {
      setOptimisticStudents({ type: "link", student: newLink });
      const formData = new FormData();
      formData.set("student_profile_id", studentId);
      const res = await linkStudentToParent(parentId, formData);
      if (res && "error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("studentLinked"));
      }
    });

    setSearchQuery("");
    setIsOpen(false);
  };

  const handleUnlink = (linkId: string) => {
    const formData = new FormData();
    formData.set("link_id", linkId);

    startTransition(async () => {
      setOptimisticStudents({ type: "unlink", linkId });
      const res = await unlinkStudentFromParent(formData);
      if (res && "ok" in res) {
        toast.success(t("studentUnlinked"));
      }
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold tracking-tight">{t("linkedChildren")}</h2>
      {candidateStudents.length > 0 ? (
        <div className="relative rounded-xl border border-card-border bg-card p-4 space-y-2">
          <label className="block text-sm font-medium">{t("linkStudent")}</label>
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder={t("selectStudent")}
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
                {filteredStudents.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectStudent(s.id, s.name);
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-accent-subtle hover:text-accent transition-colors cursor-pointer"
                    >
                      {s.name}
                    </button>
                  </li>
                ))}
                {filteredStudents.length === 0 && (
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
        {optimisticStudents.map((link) => {
          return (
            <li key={link.linkId} className="flex items-center justify-between gap-4 p-4 bg-card">
              <div className="font-medium">{link.name}</div>
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
        {optimisticStudents.length === 0 ? (
          <li className="p-4 text-sm text-muted bg-card">{t("noChildrenLinked")}</li>
        ) : null}
      </ul>
    </section>
  );
}
