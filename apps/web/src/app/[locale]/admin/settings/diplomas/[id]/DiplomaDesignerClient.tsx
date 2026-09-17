"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Type,
  Image as ImageIcon,
  Trash2,
  Save,
  RotateCcw,
  Maximize2,
  FileText,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  EyeOff,
  Sparkles,
  Plus,
} from "lucide-react";

import { saveDiplomaTemplate, uploadDiplomaAsset } from "../actions";
import { FormField, inputCls } from "@/components/FormField";
import { buttonVariants } from "@/components/ui/button";
import type { DiplomaElement } from "@/lib/diploma-types";
import { tempId } from "@/lib/temp-id";

// Canvas elements always carry an id; the shared type leaves it optional
// because persisted templates predate it.
type CanvasElement = DiplomaElement & { id: string };

type TemplateData = {
  id: string;
  name: string;
  orientation: string;
  background_image_url: string | null;
  elements: CanvasElement[];
};

const MOCK_DATA = {
  studentName: "Amina Demirović",
  groupName: "Group B (Advanced)",
  teacherName: "Amar Salihović",
  examinerName: "Dev Examiner",
  formattedDate: "25. Mai 2026",
  mosqueName: "Mekteb Dev Mosque",
};

export function DiplomaDesignerClient({ template }: { template: TemplateData }) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Template states
  const [name, setName] = useState(template.name);
  const [orientation, setOrientation] = useState(template.orientation);
  const [bgUrl, setBgUrl] = useState<string | null>(template.background_image_url);
  const [elements, setElements] = useState<CanvasElement[]>(template.elements || []);

  // Editor states
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Drag-and-drop state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    elementId: string;
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
  } | null>(null);

  // Auto-select the first element when nothing is selected. Derived rather
  // than synced through an effect so the sidebar never renders empty for a
  // frame after elements load.
  const activeId = selectedId ?? elements[0]?.id ?? null;

  const handleAddText = () => {
    const newEl: CanvasElement = {
      id: tempId("text"),
      type: "text",
      text: "Neuer Text block",
      x: 10,
      y: 40,
      width: 80,
      fontSize: 16,
      fontFamily: "Noto Serif",
      color: "#1f2937",
      align: "center",
    };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
  };

  const handleAddImage = () => {
    const newEl: CanvasElement = {
      id: tempId("image"),
      type: "image",
      url: "",
      x: 40,
      y: 10,
      width: 20,
      height: 15,
    };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
  };

  const handleDeleteElement = (id: string) => {
    setElements(elements.filter((el) => el.id !== id));
    if (activeId === id) {
      setSelectedId(null);
    }
  };

  const handleUpdateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements(elements.map((el) => (el.id === id ? { ...el, ...updates } : el)));
  };

  const handleCanvasBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const loadToast = toast.loading(t("ddBgUploading"));
    const res = await uploadDiplomaAsset(formData);
    toast.dismiss(loadToast);

    if ("error" in res) {
      toast.error(res.error);
    } else if (res.data) {
      setBgUrl(res.data);
      toast.success(t("ddBgUploaded"));
    }
  };

  const handleOverlayImageUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const loadToast = toast.loading(t("ddImgUploading"));
    const res = await uploadDiplomaAsset(formData);
    toast.dismiss(loadToast);

    if ("error" in res) {
      toast.error(res.error);
    } else if (res.data) {
      handleUpdateElement(id, { url: res.data });
      toast.success(t("ddImgUploaded"));
    }
  };

  // Drag handlers
  const handleElementMouseDown = (e: React.MouseEvent, el: CanvasElement) => {
    if (previewMode) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(el.id);

    setDragState({
      elementId: el.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: el.x,
      startY: el.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState || !canvasRef.current) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragState.startMouseX;
      const deltaY = e.clientY - dragState.startMouseY;

      // Convert delta px to delta %
      const deltaPercentX = (deltaX / canvasRect.width) * 100;
      const deltaPercentY = (deltaY / canvasRect.height) * 100;

      // Calculate new coords
      let newX = Math.round(dragState.startX + deltaPercentX);
      let newY = Math.round(dragState.startY + deltaPercentY);

      // Bound between 0 and 100
      newX = Math.max(0, Math.min(100, newX));
      newY = Math.max(0, Math.min(100, newY));

      handleUpdateElement(dragState.elementId, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (dragState) {
        setDragState(null);
      }
    };

    if (dragState) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState]);

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveDiplomaTemplate(template.id, {
        name: name.trim(),
        orientation,
        background_image_url: bgUrl,
        elements,
      });

      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(t("ddSaved"));
        router.refresh();
      }
    });
  };

  const selectedElement = elements.find((el) => el.id === activeId);

  // Helper to substitute preview vars
  const formatTextPreview = (txt: string) => {
    if (!previewMode) return txt;
    return txt
      .replace(/{studentName}/g, MOCK_DATA.studentName)
      .replace(/{groupName}/g, MOCK_DATA.groupName)
      .replace(/{teacherName}/g, MOCK_DATA.teacherName)
      .replace(/{examinerName}/g, MOCK_DATA.examinerName)
      .replace(/{formattedDate}/g, MOCK_DATA.formattedDate)
      .replace(/{mosqueName}/g, MOCK_DATA.mosqueName);
  };

  // Quick Preset Adders
  const addPresetText = (varName: string, label: string) => {
    const defaultTexts: Record<string, string> = {
      title: "ZERTIFIKAT",
      mosque: "{mosqueName}",
      student: "{studentName}",
      body: "hat die Prüfung für folgende Stufe erfolgreich bestanden:",
      group: "{groupName}",
      teacher: "Lehrkraft: {teacherName}",
      examiner: "Prüfer/in: {examinerName}",
      date: "Datum: {formattedDate}",
    };

    const yOffsets: Record<string, number> = {
      mosque: 12,
      title: 22,
      student: 45,
      body: 56,
      group: 64,
      teacher: 72,
      examiner: 84,
      date: 88,
    };

    const newEl: CanvasElement = {
      id: tempId("text"),
      type: "text",
      text: defaultTexts[varName] || label,
      x: 10,
      y: yOffsets[varName] || 50,
      width: 80,
      fontSize: varName === "title" ? 28 : varName === "student" ? 24 : 12,
      fontFamily: varName === "title" || varName === "student" ? "Noto Serif" : "Noto Sans",
      color: "#1f2937",
      align: "center",
    };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* ── CENTRAL CANVAS WORKSPACE ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col p-4 bg-surface min-h-0 overflow-y-auto">
        <div className="flex items-center gap-3 mb-4 shrink-0 bg-card p-3 rounded-xl border border-card-border">
          <div className="flex items-center gap-1.5 border-r border-card-border pr-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                previewMode
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-card-border hover:bg-surface"
              }`}
            >
              {previewMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {previewMode ? t("ddPreviewEnd") : t("ddPreview")}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddText}
              disabled={previewMode}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Type className="h-3.5 w-3.5 text-muted" />
              {t("ddTextBlock")}
            </button>
            <button
              onClick={handleAddImage}
              disabled={previewMode}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ImageIcon className="h-3.5 w-3.5 text-muted" />
              {t("ddImageBlock")}
            </button>
          </div>

          <div className="flex-1" />

          <button
            onClick={handleSave}
            disabled={isPending}
            className={buttonVariants({ size: "sm" })}
          >
            <Save className="h-3.5 w-3.5" />
            {t("ddSave")}
          </button>
        </div>

        {/* The Page Canvas Container */}
        <div className="flex-1 flex items-center justify-center p-2 min-h-0">
          <div
            ref={canvasRef}
            className={`relative bg-white border border-card-border shadow-2xl overflow-hidden select-none transition-all ${
              orientation === "landscape"
                ? "aspect-[1.414/1] w-full max-w-[760px]"
                : "aspect-[1/1.414] h-full max-h-[600px] w-auto"
            }`}
            style={{ maxHeight: orientation === "landscape" ? "calc(100vh - 250px)" : "600px" }}
          >
            {/* Background image cover */}
            {bgUrl ? (
              <img
                src={bgUrl}
                alt="Template Background"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            ) : (
              <div className="absolute inset-0 border-4 border-dashed border-muted/20 flex flex-col items-center justify-center text-center p-8 text-muted">
                <FileText className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-sm font-semibold">{t("ddNoBg")}</p>
                <p className="text-xs opacity-60">{t("ddNoBgHint")}</p>
              </div>
            )}

            {/* Elements Layer */}
            {elements.map((el) => {
              const isSelected = el.id === activeId;
              if (el.type === "text") {
                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    className={`absolute flex flex-col items-stretch group cursor-move ${
                      isSelected && !previewMode ? "ring-2 ring-accent ring-offset-1 z-30" : "z-10"
                    }`}
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: el.width ? `${el.width}%` : "auto",
                      transform: el.align === "center" ? "translateX(0)" : "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: el.fontSize ? `${el.fontSize * 0.9}px` : "14px", // visually scaled down slightly for editing
                        fontFamily: el.fontFamily === "Noto Serif" ? "Noto Serif, serif" : "Inter, sans-serif",
                        color: el.color || "#000",
                        textAlign: el.align || "left",
                        whiteSpace: "pre-wrap",
                      }}
                      className="font-medium p-1 w-full"
                    >
                      {formatTextPreview(el.text || "Text")}
                    </div>
                    {isSelected && !previewMode && (
                      <button
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleDeleteElement(el.id);
                        }}
                        className="absolute -top-3.5 -right-3.5 h-6 w-6 rounded-full bg-danger hover:bg-danger/90 text-white flex items-center justify-center border border-white shadow-md z-40 transition-transform hover:scale-110"
                        title={t("ddDeleteText")}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              } else if (el.type === "image") {
                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                    className={`absolute group cursor-move ${
                      isSelected && !previewMode ? "ring-2 ring-accent ring-offset-1 z-30" : "z-10"
                    }`}
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: `${el.width || 10}%`,
                      height: `${el.height || 10}%`,
                    }}
                  >
                    {el.url ? (
                      <img
                        src={el.url}
                        alt="Overlay Asset"
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-200 border border-neutral-300 rounded flex items-center justify-center text-neutral-500 text-[11px] p-1 font-semibold">
                        {t("ddImgMissing")}
                      </div>
                    )}
                    {isSelected && !previewMode && (
                      <button
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleDeleteElement(el.id);
                        }}
                        className="absolute -top-3.5 -right-3.5 h-6 w-6 rounded-full bg-danger hover:bg-danger/90 text-white flex items-center justify-center border border-white shadow-md z-40 transition-transform hover:scale-110"
                        title={t("ddDeleteImage")}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>

      {/* ── SIDEBAR PROPERTIES INSPECTOR ────────────────────────────────── */}
      <div className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-card-border bg-card p-5 overflow-y-auto h-auto lg:h-full flex flex-col gap-5">
        {/* Template Settings */}
        <section className="space-y-3 pb-4 border-b border-card-border">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">{t("ddOptions")}</h3>
          <FormField label={t("ddName")}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder={t("ddNamePh")}
              disabled={previewMode}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label={t("ddOrientation")}>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-card-border bg-background px-2.5 py-1.5 text-xs transition-colors focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
                disabled={previewMode}
              >
                <option value="landscape">{t("ddLandscape")}</option>
                <option value="portrait">{t("ddPortrait")}</option>
              </select>
            </FormField>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-foreground mb-1">{t("ddBackground")}</span>
              <label className="inline-flex items-center justify-center rounded-lg border border-card-border bg-background px-3 py-1.5 text-xs font-semibold cursor-pointer hover:bg-surface transition-all">
                {t("ddChooseFile")}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCanvasBgUpload}
                  className="hidden"
                  disabled={previewMode}
                />
              </label>
            </div>
          </div>
        </section>

        {/* Selected Element settings */}
        {selectedElement && !previewMode ? (
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
                {t("ddElement")}: {selectedElement.type === "text" ? t("ddElText") : t("ddElImage")}
              </h3>
              <button
                type="button"
                onClick={() => handleDeleteElement(selectedElement.id)}
                className="text-danger hover:text-danger-fg p-1 transition-colors"
                title={t("ddDelete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {selectedElement.type === "text" && (
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                <FormField label={t("ddContent")}>
                  <textarea
                    rows={3}
                    value={selectedElement.text || ""}
                    onChange={(e) => handleUpdateElement(selectedElement.id, { text: e.target.value })}
                    className={`${inputCls} resize-none font-sans`}
                    placeholder={t("ddContentPh")}
                  />
                  {/* Variables Buttons List */}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {[
                      { var: "{studentName}", label: t("ddVarStudent") },
                      { var: "{groupName}", label: t("ddVarGroup") },
                      { var: "{teacherName}", label: t("ddVarTeacher") },
                      { var: "{examinerName}", label: t("ddVarExaminer") },
                      { var: "{formattedDate}", label: t("ddVarDate") },
                      { var: "{mosqueName}", label: t("ddVarMosque") },
                    ].map((variable) => (
                      <button
                        key={variable.var}
                        type="button"
                        onClick={() => {
                          const currentText = selectedElement.text || "";
                          handleUpdateElement(selectedElement.id, {
                            text: currentText + variable.var,
                          });
                        }}
                        className="rounded bg-accent-subtle/50 px-1.5 py-0.5 text-[11px] font-semibold text-accent hover:bg-accent-subtle transition-all"
                      >
                        +{variable.label}
                      </button>
                    ))}
                  </div>
                </FormField>

                <div className="grid grid-cols-2 gap-2">
                  <FormField label={t("ddFontSize")}>
                    <input
                      type="number"
                      min={8}
                      max={96}
                      value={selectedElement.fontSize || 14}
                      onChange={(e) =>
                        handleUpdateElement(selectedElement.id, {
                          fontSize: parseInt(e.target.value, 10) || 14,
                        })
                      }
                      className={inputCls}
                    />
                  </FormField>
                  <FormField label={t("ddFont")}>
                    <select
                      value={selectedElement.fontFamily || "Noto Serif"}
                      onChange={(e) => handleUpdateElement(selectedElement.id, { fontFamily: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-card-border bg-background px-2.5 py-1.5 text-xs transition-colors focus:border-accent focus:outline-none"
                    >
                      <option value="Noto Serif">{t("ddSerif")}</option>
                      <option value="Noto Sans">Noto Sans (Sans-serif)</option>
                    </select>
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-2 items-end">
                  <FormField label={t("ddColor")}>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={selectedElement.color || "#000000"}
                        onChange={(e) => handleUpdateElement(selectedElement.id, { color: e.target.value })}
                        className="h-8 w-8 rounded-lg border border-card-border overflow-hidden cursor-pointer"
                      />
                      <span className="text-[11px] font-mono">{selectedElement.color || "#000000"}</span>
                    </div>
                  </FormField>
                  <div>
                    <span className="text-[11px] font-medium text-foreground mb-1 block">{t("ddAlign")}</span>
                    <div className="flex border border-card-border rounded-lg overflow-hidden bg-background h-8">
                      {(["left", "center", "right"] as const).map((alignment) => (
                        <button
                          key={alignment}
                          type="button"
                          onClick={() => handleUpdateElement(selectedElement.id, { align: alignment })}
                          className={`flex-1 flex items-center justify-center transition-colors hover:bg-surface ${
                            selectedElement.align === alignment ? "bg-accent/10 text-accent font-semibold" : "text-muted"
                          }`}
                        >
                          {alignment === "left" && <AlignLeft className="h-3.5 w-3.5" />}
                          {alignment === "center" && <AlignCenter className="h-3.5 w-3.5" />}
                          {alignment === "right" && <AlignRight className="h-3.5 w-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <FormField label={t("ddAreaWidth")}>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={selectedElement.width || 80}
                      onChange={(e) =>
                        handleUpdateElement(selectedElement.id, {
                          width: parseInt(e.target.value, 10),
                        })
                      }
                      className="flex-1 accent-accent"
                    />
                    <span className="text-[11px] font-mono font-semibold w-6">{selectedElement.width || 80}%</span>
                  </div>
                </FormField>
              </div>
            )}

            {selectedElement.type === "image" && (
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-foreground mb-1">{t("ddUploadImage")}</span>
                  <label className="inline-flex items-center justify-center rounded-lg border border-card-border bg-background px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-surface transition-all">
                    {t("ddChooseFile")}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleOverlayImageUpload(selectedElement.id, e)}
                      className="hidden"
                    />
                  </label>
                </div>

                <FormField label={t("ddImageUrl")}>
                  <input
                    value={selectedElement.url || ""}
                    onChange={(e) => handleUpdateElement(selectedElement.id, { url: e.target.value })}
                    className={inputCls}
                    placeholder="https://..."
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-2">
                  <FormField label={t("ddWidth")}>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={selectedElement.width || 10}
                      onChange={(e) =>
                        handleUpdateElement(selectedElement.id, {
                          width: parseInt(e.target.value, 10) || 10,
                        })
                      }
                      className={inputCls}
                    />
                  </FormField>
                  <FormField label={t("ddHeight")}>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={selectedElement.height || 10}
                      onChange={(e) =>
                        handleUpdateElement(selectedElement.id, {
                          height: parseInt(e.target.value, 10) || 10,
                        })
                      }
                      className={inputCls}
                    />
                  </FormField>
                </div>
              </div>
            )}

            {/* Position coordinate sliders */}
            <section className="space-y-2 border-t border-card-border pt-3 mt-auto shrink-0 bg-card">
              <h4 className="text-[11px] font-semibold text-muted uppercase">{t("ddCoords")}</h4>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="X-Koordinate (%)">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={selectedElement.x}
                    onChange={(e) =>
                      handleUpdateElement(selectedElement.id, {
                        x: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Y-Koordinate (%)">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={selectedElement.y}
                    onChange={(e) =>
                      handleUpdateElement(selectedElement.id, {
                        y: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className={inputCls}
                  />
                </FormField>
              </div>
            </section>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-card-border rounded-xl bg-surface">
            <Sparkles className="h-8 w-8 mb-2 text-accent opacity-60" />
            <span className="text-xs font-semibold text-muted">{t("ddQuickstart")}</span>
            <p className="text-[11px] text-muted opacity-80 mt-1 max-w-[200px]">
              {t("ddQuickstartHint")}
            </p>
            <div className="mt-4 flex flex-col gap-2 w-full">
              {[
                { label: t("ddPMosque"), key: "mosque" },
                { label: t("ddPTitle"), key: "title" },
                { label: t("ddPBody"), key: "body" },
                { label: t("ddPStudent"), key: "student" },
                { label: t("ddPGroup"), key: "group" },
                { label: t("ddPTeacher"), key: "teacher" },
                { label: t("ddPExaminer"), key: "examiner" },
                { label: t("ddPDate"), key: "date" },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => addPresetText(p.key, p.label)}
                  disabled={previewMode}
                  className="rounded-lg border border-card-border hover:bg-surface py-1.5 text-[11px] font-semibold text-foreground/80 hover:text-foreground transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-3 w-3 text-muted" />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
