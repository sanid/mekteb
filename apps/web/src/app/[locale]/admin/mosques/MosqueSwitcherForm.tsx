"use client";

import { useTransition } from "react";
import { switchMosque } from "./actions";
import { buttonVariants } from "@/components/ui/button";

export function MosqueSwitcherForm({
  mosqueId,
  label,
}: {
  mosqueId: string;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      await switchMosque(mosqueId);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <button
        type="submit"
        disabled={isPending}
        className={buttonVariants({ size: "sm" })}
      >
        {label}
      </button>
    </form>
  );
}
