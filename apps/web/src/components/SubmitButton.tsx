"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  className,
  pendingText,
  disabled,
  fullWidth = false,
  variant = "primary",
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: React.ReactNode;
  disabled?: boolean;
  /** Stretch to fill the container width. */
  fullWidth?: boolean;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(
        buttonVariants({
          variant: variant === "primary" ? "default" : "outline",
          size: "xl",
        }),
        fullWidth && "w-full",
        className,
      )}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
