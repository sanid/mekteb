"use client";

import { useOptimistic, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ChevronRight, GraduationCap, Plus, X } from "lucide-react";
import { SubmitButton } from "@/components/SubmitButton";
import { FormField, FormCard, inputCls } from "@/components/FormField";
import { createStudent } from "./actions";
import { buttonVariants } from "@/components/ui/button";
import { emptyCard, listCard } from "@/components/ui/surfaces";
import { cn } from "@/lib/utils";

export type StudentType = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  is_active: boolean;
  created_at: string;
  parentNames: string[];
};

export function StudentListClient({ initialStudents }: { initialStudents: StudentType[] }) {
  const t = useTranslations("Admin");
  const formRef = useRef<HTMLFormElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [optimisticStudents, addOptimisticStudent] = useOptimistic(
    initialStudents,
    (state, newStudent: StudentType) => [newStudent, ...state],
  );

  // Reset to the first page whenever the search changes. Adjusting state
  // during render (rather than in an effect) avoids a second render pass
  // showing a stale page. See react.dev "You Might Not Need an Effect".
  const [pagedQuery, setPagedQuery] = useState(searchQuery);
  if (pagedQuery !== searchQuery) {
    setPagedQuery(searchQuery);
    setCurrentPage(1);
  }

  async function action(formData: FormData) {
    const full_name = String(formData.get("full_name") ?? "").trim();
    const dobRaw = String(formData.get("date_of_birth") ?? "").trim();
    const date_of_birth = dobRaw === "" ? null : dobRaw;
    if (!full_name) return;

    formRef.current?.reset();
    addOptimisticStudent({
      id: Date.now().toString(),
      full_name,
      date_of_birth,
      is_active: true,
      created_at: new Date().toISOString(),
      parentNames: [],
    });

    await createStudent(formData);
    setAddOpen(false);
  }

  const itemsPerPage = 20;

  // Search instantly on keypress after second character
  const filteredStudents = searchQuery.trim().length >= 2
    ? optimisticStudents.filter(
        (s) =>
          s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.parentNames.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : optimisticStudents;

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-muted" />
        <h2 className="text-base font-semibold tracking-tight">{t("students")}</h2>
        {filteredStudents.length > 0 && (
          <span className="rounded-full bg-accent-subtle text-accent text-xs font-semibold px-2.5 py-0.5 ml-1">
            {searchQuery.trim().length >= 2 ? `${filteredStudents.length} / ${optimisticStudents.length}` : optimisticStudents.length}
          </span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className={buttonVariants({ size: "sm" })}
        >
          {addOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {addOpen ? t("cancel") : t("addStudent")}
        </button>
      </div>

      {/* Interactive Search Bar */}
      <div className="flex gap-2">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("search")}
          className={cn(inputCls, "flex-1")}
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className={buttonVariants({ variant: "outline", size: "xl" })}
          >
            {t("clearFilter")}
          </button>
        ) : null}
      </div>

      {/* Create form */}
      {addOpen ? (
      <FormCard
        title={t("addStudent")}
        description={t("studentFormDesc")}
      >
        <form ref={formRef} action={action} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={t("fullName")} required>
              <input
                name="full_name"
                required
                placeholder={t("fullNamePlaceholder")}
                className={inputCls}
              />
            </FormField>
            <FormField label={t("dateOfBirthOpt")}>
              <input
                type="date"
                name="date_of_birth"
                className={inputCls}
              />
            </FormField>
          </div>
          <SubmitButton pendingText={t("saving")}>
            {t("addStudent")}
          </SubmitButton>
        </form>
      </FormCard>
      ) : null}

      {/* List */}
      {paginatedStudents.length > 0 ? (
        <div className="space-y-4">
          <ul className={cn(listCard, "bg-card")}>
            {paginatedStudents.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/students/${s.id}`}
                  prefetch
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-accent-subtle group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-medium">{s.full_name}</span>
                      {s.date_of_birth && (
                        <span className="text-xs text-muted">{s.date_of_birth}</span>
                      )}
                    </div>
                    {s.parentNames.length > 0 && (
                      <div className="text-sm text-muted truncate">{s.parentNames.join(", ")}</div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            ))}
          </ul>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-card-border pt-4 px-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {t("prev")}
              </button>

              <span className="text-xs text-muted">
                {t("pageOf", { page: currentPage, total: totalPages })}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {t("next")}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={emptyCard}>
          {searchQuery.trim().length >= 2 ? t("noResults") : t("noStudents")}
        </div>
      )}
    </div>
  );
}
