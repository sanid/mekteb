"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { Edit2, Trash2, X, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";

import { createCategory, updateCategory, deleteCategory } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormField, FormCard, inputCls } from "@/components/FormField";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { emptyCard, listCard } from "@/components/ui/surfaces";
import { cn } from "@/lib/utils";

type CategoryType = {
  id: string;
  name: string;
  color: string;
  is_hifz: boolean;
};

const PRESET_COLORS = [
  "#10b981", // Emerald
  "#14b8a6", // Teal
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#f43f5e", // Rose
  "#f59e0b", // Amber
  "#0ea5e9", // Sky
];

export function CategoriesClient({ initialCategories }: { initialCategories: CategoryType[] }) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Create Form State
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [newIsHifz, setNewIsHifz] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editIsHifz, setEditIsHifz] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const formData = new FormData();
    formData.append("name", newName);
    formData.append("color", newColor);
    formData.append("is_hifz", newIsHifz ? "true" : "false");

    startTransition(async () => {
      const res = await createCategory(formData);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("categorySaved"));
        setNewName("");
        setNewIsHifz(false);
        setAddOpen(false);
        router.refresh();
      }
    });
  };

  const handleStartEdit = (cat: CategoryType) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
    setEditIsHifz(cat.is_hifz);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;

    const formData = new FormData();
    formData.append("name", editName);
    formData.append("color", editColor);
    formData.append("is_hifz", editIsHifz ? "true" : "false");

    startTransition(async () => {
      const res = await updateCategory(id, formData);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("categorySaved"));
        setEditingId(null);
        router.refresh();
      }
    });
  };

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      const res = await deleteCategory(id);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("categoryDeleted"));
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold tracking-tight">{t("categories")}</h2>
        {initialCategories.length > 0 && (
          <span className="rounded-full bg-accent-subtle text-accent text-xs font-semibold px-2.5 py-0.5 ml-1">
            {initialCategories.length}
          </span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className={buttonVariants({ size: "sm" })}
        >
          {addOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {addOpen ? t("cancel") : t("addCategory")}
        </button>
      </div>

      {/* Create form */}
      {addOpen ? (
      <FormCard title={t("addCategory")} description={t("categoryFormDesc")}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={t("categoryName")} required>
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("categoryNamePlaceholder")}
                className={inputCls}
              />
            </FormField>

            <FormField label={t("categoryColor")}>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
                    style={{
                      backgroundColor: c,
                      borderColor: newColor === c ? "var(--foreground)" : "transparent",
                    }}
                  >
                    {newColor === c && <Check className="h-4 w-4 text-white drop-shadow-sm" />}
                  </button>
                ))}
                <div className="h-8 border-l border-card-border mx-1" />
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded-full border border-card-border p-0 overflow-hidden"
                />
              </div>
            </FormField>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newIsHifz}
              onChange={(e) => setNewIsHifz(e.target.checked)}
              className="accent-accent h-4 w-4 rounded"
            />
            <span className="text-sm font-medium">{t("categoryIsHifz")}</span>
            <span className="text-xs text-muted">{t("categoryIsHifzDesc")}</span>
          </label>
          <Button type="submit" disabled={isPending} className="mt-2 shrink-0">
            <Plus className="h-4 w-4" />
            {t("addCategory")}
          </Button>
        </form>
      </FormCard>
      ) : null}

      {/* List */}
      <div className="space-y-3">
        {initialCategories.length > 0 ? (
          <ul className={cn(listCard, "bg-card")}>
            {initialCategories.map((c) => {
              const isEditing = editingId === c.id;
              return (
                <li key={c.id} className="p-4 transition-colors hover:bg-accent-subtle/20">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        <input
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={`${inputCls} flex-1`}
                        />
                        <div className="flex items-center gap-2">
                          {PRESET_COLORS.map((col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={() => setEditColor(col)}
                              className="h-7 w-7 rounded-full border transition-transform hover:scale-115 flex items-center justify-center cursor-pointer"
                              style={{
                                backgroundColor: col,
                                borderColor: editColor === col ? "var(--foreground)" : "transparent",
                              }}
                            >
                              {editColor === col && <Check className="h-3 w-3 text-white" />}
                            </button>
                          ))}
                          <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="h-7 w-7 cursor-pointer rounded-full border border-card-border p-0"
                          />
                        </div>
                        <div className="flex gap-2 shrink-0 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdate(c.id)}
                            disabled={isPending}
                            className="bg-success/10 hover:bg-success/20 text-success-fg border-success/20"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editIsHifz}
                          onChange={(e) => setEditIsHifz(e.target.checked)}
                          className="accent-accent h-4 w-4 rounded"
                        />
                        <span className="text-sm font-medium">{t("categoryIsHifz")}</span>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="h-4.5 w-4.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="font-semibold truncate">{c.name}</span>
                        {c.is_hifz && (
                          <span className="rounded-full bg-success-subtle text-success-fg text-xs font-medium px-2 py-0.5 shrink-0">
                            {t("categoryIsHifz")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEdit(c)}
                          disabled={isPending}
                          className="text-muted hover:text-foreground h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <ConfirmDialog
                          title={t("deleteCategory")}
                          description={t("confirmDeleteCategory")}
                          confirmLabel={t("deleteCategory")}
                          cancelLabel={t("cancel")}
                          variant="destructive"
                          onConfirm={() => handleDelete(c.id)}
                          trigger={
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isPending}
                              className="text-danger hover:text-danger-fg hover:bg-danger/10 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={emptyCard}>
            {t("noCategories")}
          </div>
        )}
      </div>
    </div>
  );
}
