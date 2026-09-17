"use client";

import { useTransition, useState } from "react";
import { Archive, Trash2, Edit, Check } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { FormField, inputCls, selectCls } from "@/components/FormField";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { archiveGroup, deleteGroup, updateGroupDetails } from "./actions";

export type CategoryOption = {
  id: string;
  name: string;
  color: string;
};

export function GroupActions({
  groupId,
  groupName,
  groupDescription,
  groupRoom,
  groupCategoryId,
  categories,
  archiveLabel,
  deleteLabel,
  confirmArchive,
  confirmDelete,
  cancelLabel,
  groupsPath,
  initialWeekdays = [],
  initialStartTime = "10:00",
  initialEndTime = "12:00",
}: {
  groupId: string;
  groupName: string;
  groupDescription: string | null;
  groupRoom?: string | null;
  groupCategoryId: string | null;
  categories: CategoryOption[];
  archiveLabel: string;
  deleteLabel: string;
  confirmArchive: string;
  confirmDelete: string;
  cancelLabel: string;
  groupsPath: string;
  initialWeekdays?: number[];
  initialStartTime?: string;
  initialEndTime?: string;
}) {
  const router = useRouter();
  const t = useTranslations("Admin");
  const [pendingArchive, startArchive] = useTransition();
  const [pendingDelete, startDelete] = useTransition();
  const [pendingUpdate, startUpdate] = useTransition();

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(groupName);
  const [description, setDescription] = useState(groupDescription ?? "");
  const [room, setRoom] = useState(groupRoom ?? "");
  const [categoryId, setCategoryId] = useState(groupCategoryId ?? "");
  const [weekdays, setWeekdays] = useState<number[]>(initialWeekdays);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("room", room);
    formData.append("category_id", categoryId);

    // Append schedule data to update the schedule
    weekdays.forEach((day) => {
      formData.append("weekdays", String(day));
    });
    formData.append("start_time", startTime);
    formData.append("end_time", endTime);

    startUpdate(async () => {
      const res = await updateGroupDetails(groupId, formData);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("categorySaved"));
        setEditOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (open) {
            setName(groupName);
            setDescription(groupDescription ?? "");
            setRoom(groupRoom ?? "");
            setCategoryId(groupCategoryId ?? "");
            setWeekdays(initialWeekdays);
            setStartTime(initialStartTime);
            setEndTime(initialEndTime);
          }
        }}
      >
        <DialogTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              disabled={pendingArchive || pendingDelete || pendingUpdate}
            >
              <Edit className="h-4 w-4" />
              {t("editGroup")}
            </Button>
          }
        />
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdate} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{t("editGroupDetails")}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto px-1 -mx-1 py-1 space-y-4">
              <FormField label={t("groupName")} required>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                />
              </FormField>
              <FormField label={t("descriptionOpt")}>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={inputCls}
                />
              </FormField>
              <FormField label={t("groupRoom")}>
                <input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder={t("groupRoomPlaceholder")}
                  className={inputCls}
                />
              </FormField>
              <FormField label={t("groupCategoryLabel")}>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={selectCls}
                >
                  <option value="">{t("selectCategory")}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <hr className="border-card-border" />

              <FormField label={t("weekdays")}>
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                    <label
                      key={d}
                      className="flex items-center gap-1.5 text-sm cursor-pointer rounded-full border border-card-border px-3 py-1.5 hover:bg-surface"
                    >
                      <input
                        type="checkbox"
                        checked={weekdays.includes(d)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setWeekdays([...weekdays, d]);
                          } else {
                            setWeekdays(weekdays.filter((w) => w !== d));
                          }
                        }}
                        className="accent-accent"
                      />
                      {t(`weekday_${d}` as "weekday_0")}
                    </label>
                  ))}
                </div>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={t("startTime")}>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={inputCls}
                  />
                </FormField>
                <FormField label={t("endTime")}>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={inputCls}
                  />
                </FormField>
              </div>

              <p className="text-xs text-muted">{t("scheduleSameTimeNote")}</p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={pendingUpdate}
              >
                {cancelLabel}
              </Button>
              <Button type="submit" disabled={pendingUpdate}>
                {pendingUpdate ? "…" : t("saveChanges")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive */}
      <ConfirmDialog
        title={archiveLabel}
        description={confirmArchive}
        confirmLabel={archiveLabel}
        cancelLabel={cancelLabel}
        onConfirm={() =>
          new Promise<void>((resolve) =>
            startArchive(async () => {
              await archiveGroup(groupId);
              router.push(groupsPath);
              resolve();
            }),
          )
        }
        trigger={
          <Button
            variant="outline"
            size="sm"
            disabled={pendingArchive || pendingDelete || pendingUpdate}
          >
            <Archive className="h-4 w-4" />
            {pendingArchive ? "…" : archiveLabel}
          </Button>
        }
      />

      {/* Delete */}
      <ConfirmDialog
        title={deleteLabel}
        description={confirmDelete}
        confirmLabel={deleteLabel}
        cancelLabel={cancelLabel}
        variant="destructive"
        onConfirm={() =>
          new Promise<void>((resolve) =>
            startDelete(async () => {
              const result = await deleteGroup(groupId);
              if ("ok" in result) {
                router.push(groupsPath);
              }
              resolve();
            }),
          )
        }
        trigger={
          <Button
            variant="destructive"
            size="sm"
            disabled={pendingArchive || pendingDelete || pendingUpdate}
          >
            <Trash2 className="h-4 w-4" />
            {pendingDelete ? "…" : deleteLabel}
          </Button>
        }
      />
    </div>
  );
}
