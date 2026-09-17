"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";

export function ColorPicker({
  name,
  label,
  defaultValue,
  resetValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
  resetValue: string;
}) {
  const t = useTranslations("Admin");
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateStyle = (val: string) => {
    setValue(val);
    if (typeof window !== "undefined") {
      const prop = name === "primary_color" ? "--primary" : name === "secondary_color" ? "--secondary" : null;
      if (prop) {
        document.documentElement.style.setProperty(prop, val);
        if (name === "primary_color") {
          document.documentElement.style.setProperty("--accent", val);
          document.cookie = `mosque_primary_color=${encodeURIComponent(val)}; path=/; max-age=604800; SameSite=Lax`;
        } else if (name === "secondary_color") {
          document.cookie = `mosque_secondary_color=${encodeURIComponent(val)}; path=/; max-age=604800; SameSite=Lax`;
        }
      }
    }
  };

  const handleReset = () => {
    updateStyle(resetValue);
    if (inputRef.current) inputRef.current.value = resetValue;
  };

  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          ref={inputRef}
          type="color"
          name={name}
          value={value}
          onChange={(e) => updateStyle(e.target.value)}
          className="h-9 w-14 cursor-pointer rounded border border-card-border bg-background p-1"
        />
        {value.toLowerCase() !== resetValue.toLowerCase() && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 rounded-md border border-card-border px-2 py-1 text-xs text-muted hover:bg-surface transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            {t("resetToDefault")}
          </button>
        )}
      </div>
    </label>
  );
}
