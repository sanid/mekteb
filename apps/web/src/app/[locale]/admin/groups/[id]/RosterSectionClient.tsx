"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { GraduationCap, Plus, X } from "lucide-react";

import { FormCard } from "@/components/FormField";
import { MultiSelectList } from "@/components/MultiSelectList";
import { Link } from "@/i18n/routing";
import { bulkEnrollStudents, unenrollStudent } from "./actions";
import { buttonVariants } from "@/components/ui/button";
import { listCard } from "@/components/ui/surfaces";

interface EnrolledStudent {
  enrollmentId: string;
  studentId: string;
  name: string;
}

interface StudentCandidate {
  id: string;
  name: string;
}

export function RosterSectionClient({
  groupId,
  initialEnrolledStudents,
  allStudents,
  hifzData,
}: {
  groupId: string;
  initialEnrolledStudents: EnrolledStudent[];
  allStudents: StudentCandidate[];
  hifzData?: Record<string, number>;
}) {
  const t = useTranslations("Admin");
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);

  const [optimisticEnrolled, setOptimisticEnrolled] = useOptimistic(
    initialEnrolledStudents,
    (
      state,
      action:
        | { type: "enroll"; students: EnrolledStudent[] }
        | { type: "unenroll"; enrollmentId: string },
    ) => {
      switch (action.type) {
        case "enroll":
          return [...state, ...action.students];
        case "unenroll":
          return state.filter((s) => s.enrollmentId !== action.enrollmentId);
        default:
          return state;
      }
    },
  );

  const enrolledIds = new Set(optimisticEnrolled.map((s) => s.studentId));
  const candidateStudents = allStudents
    .filter((s) => !enrolledIds.has(s.id))
    .map((s) => ({ id: s.id, label: s.name }));

  const handleBulkEnroll = async (formData: FormData) => {
    const studentIds = formData.getAll("student_profile_ids").map(String);
    if (studentIds.length === 0) return;

    const newEnrolled = studentIds.map((id) => {
      const student = allStudents.find((s) => s.id === id);
      return {
        enrollmentId: `temp-${Date.now()}-${id}`,
        studentId: id,
        name: student?.name ?? "—",
      };
    });

    startTransition(async () => {
      setOptimisticEnrolled({ type: "enroll", students: newEnrolled });
      const res = await bulkEnrollStudents(groupId, formData);
      if (res && "error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("studentEnrolled"));
        setAddOpen(false);
      }
    });
  };

  const handleUnenroll = (enrollmentId: string) => {
    startTransition(async () => {
      setOptimisticEnrolled({ type: "unenroll", enrollmentId });
      await unenrollStudent(groupId, enrollmentId);
      toast.success(t("studentUnenrolled"));
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-muted" />
        <h2 className="text-base font-semibold tracking-tight">{t("roster")}</h2>
        {optimisticEnrolled.length > 0 && (
          <span className="rounded-full bg-accent-subtle text-accent text-xs font-semibold px-2.5 py-0.5 ml-1">
            {optimisticEnrolled.length}
          </span>
        )}
        <div className="flex-1" />
        {candidateStudents.length > 0 ? (
          <button
            type="button"
            onClick={() => setAddOpen((o) => !o)}
            className={buttonVariants({ size: "sm" })}
          >
            {addOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {addOpen ? t("cancel") : t("enrollStudents")}
          </button>
        ) : (
          <span className="text-xs text-muted">{t("allStudentsEnrolled")}</span>
        )}
      </div>

      {addOpen && candidateStudents.length > 0 ? (
        <FormCard
          title={t("enrollStudents")}
          description={t("enrollStudentsDesc")}
        >
          <MultiSelectList
            items={candidateStudents}
            name="student_profile_ids"
            action={handleBulkEnroll}
            submitLabel={t("enroll")}
            searchPlaceholder={t("searchStudents")}
          />
        </FormCard>
      ) : null}

      {optimisticEnrolled.length > 0 ? (
        <ul className={listCard}>
          {optimisticEnrolled.map((s) => (
            <li key={s.enrollmentId} className="flex items-center justify-between px-4 py-3 bg-card">
              <Link
                href={`/admin/students/${s.studentId}`}
                className="flex items-center gap-2.5 hover:text-accent transition-colors min-w-0"
              >
                <div className="h-7 w-7 rounded-full bg-accent-subtle flex items-center justify-center text-xs font-semibold text-accent shrink-0">
                  {s.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-sm font-medium truncate">{s.name}</span>
                {hifzData && hifzData[s.studentId] !== undefined && (
                  <span className="ml-1 shrink-0 rounded-full bg-success-subtle text-success-fg text-xs font-semibold px-2 py-0.5 tabular-nums">
                    {hifzData[s.studentId]}/604
                  </span>
                )}
              </Link>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleUnenroll(s.enrollmentId)}
                className="text-xs text-muted hover:text-danger transition-colors disabled:opacity-50"
              >
                {t("unenroll")}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-card-border p-6 text-center text-sm text-muted">
          {t("noStudentsEnrolled")}
        </div>
      )}
    </section>
  );
}
