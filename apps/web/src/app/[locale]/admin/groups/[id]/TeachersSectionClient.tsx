"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { BookOpen, Plus, X } from "lucide-react";

import { FormCard } from "@/components/FormField";
import { MultiSelectList } from "@/components/MultiSelectList";
import { Link } from "@/i18n/routing";
import { bulkAssignTeachers, unassignTeacher } from "./actions";
import { buttonVariants } from "@/components/ui/button";
import { listCard } from "@/components/ui/surfaces";

interface TeacherLink {
  id: string;
  teacherProfileId: string;
  name: string;
}

interface TeacherCandidate {
  id: string;
  name: string;
}

export function TeachersSectionClient({
  groupId,
  initialTeacherLinks,
  allTeachers,
}: {
  groupId: string;
  initialTeacherLinks: TeacherLink[];
  allTeachers: TeacherCandidate[];
}) {
  const t = useTranslations("Admin");
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);

  const [optimisticTeachers, setOptimisticTeachers] = useOptimistic(
    initialTeacherLinks,
    (
      state,
      action:
        | { type: "assign"; teachers: TeacherLink[] }
        | { type: "unassign"; linkId: string },
    ) => {
      switch (action.type) {
        case "assign":
          return [...state, ...action.teachers];
        case "unassign":
          return state.filter((t) => t.id !== action.linkId);
        default:
          return state;
      }
    },
  );

  const assignedTeacherIds = new Set(optimisticTeachers.map((t) => t.teacherProfileId));
  const candidateTeachers = allTeachers
    .filter((t) => !assignedTeacherIds.has(t.id))
    .map((t) => ({ id: t.id, label: t.name }));

  const handleBulkAssign = async (formData: FormData) => {
    const teacherIds = formData.getAll("teacher_profile_ids").map(String);
    if (teacherIds.length === 0) return;

    const newAssigned = teacherIds.map((id) => {
      const teacher = allTeachers.find((t) => t.id === id);
      return {
        id: `temp-${Date.now()}-${id}`,
        teacherProfileId: id,
        name: teacher?.name ?? "—",
      };
    });

    startTransition(async () => {
      setOptimisticTeachers({ type: "assign", teachers: newAssigned });
      const res = await bulkAssignTeachers(groupId, formData);
      if (res && "error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("teacherAssigned"));
        setAddOpen(false);
      }
    });
  };

  const handleUnassign = (linkId: string) => {
    startTransition(async () => {
      setOptimisticTeachers({ type: "unassign", linkId });
      await unassignTeacher(groupId, linkId);
      toast.success(t("teacherUnassigned"));
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-muted" />
        <h2 className="text-base font-semibold tracking-tight">{t("teachers")}</h2>
        {optimisticTeachers.length > 0 && (
          <span className="rounded-full bg-accent-subtle text-accent text-xs font-semibold px-2.5 py-0.5 ml-1">
            {optimisticTeachers.length}
          </span>
        )}
        <div className="flex-1" />
        {candidateTeachers.length > 0 ? (
          <button
            type="button"
            onClick={() => setAddOpen((o) => !o)}
            className={buttonVariants({ size: "sm" })}
          >
            {addOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {addOpen ? t("cancel") : t("assignTeachers")}
          </button>
        ) : (
          <span className="text-xs text-muted">{t("allTeachersAssigned")}</span>
        )}
      </div>

      {addOpen && candidateTeachers.length > 0 ? (
        <FormCard
          title={t("assignTeachers")}
          description={t("assignTeachersDesc")}
        >
          <MultiSelectList
            items={candidateTeachers}
            name="teacher_profile_ids"
            action={handleBulkAssign}
            submitLabel={t("assign")}
            searchPlaceholder={t("searchTeachers")}
          />
        </FormCard>
      ) : null}

      {optimisticTeachers.length > 0 ? (
        <ul className={listCard}>
          {optimisticTeachers.map((l) => (
            <li key={l.id} className="flex items-center justify-between px-4 py-3 bg-card">
              <Link
                href={`/admin/teachers/${l.teacherProfileId}`}
                className="flex items-center gap-2.5 hover:text-accent transition-colors"
              >
                <div className="h-7 w-7 rounded-full bg-accent-subtle flex items-center justify-center text-xs font-semibold text-accent shrink-0">
                  {l.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{l.name}</span>
              </Link>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleUnassign(l.id)}
                className="text-xs text-muted hover:text-danger transition-colors disabled:opacity-50"
              >
                {t("unassign")}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-card-border p-6 text-center text-sm text-muted">
          {t("noTeachersAssigned")}
        </div>
      )}
    </section>
  );
}
