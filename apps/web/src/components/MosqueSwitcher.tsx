"use client";

import { useTransition } from "react";
import { switchMosque } from "@/app/[locale]/admin/mosques/actions";

export function MosqueSwitcher({
  mosques,
  activeMosqueId,
}: {
  mosques: { id: string; name: string }[];
  activeMosqueId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    startTransition(async () => {
      await switchMosque(id);
    });
  }

  return (
    <select
      value={activeMosqueId}
      onChange={handleChange}
      disabled={isPending}
      className="w-full rounded border border-card-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20 disabled:opacity-50 cursor-pointer"
    >
      {mosques.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}
