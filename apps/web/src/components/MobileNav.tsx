"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function MobileNav({
  brand,
  children,
  openLabel = "Open navigation",
}: {
  brand: ReactNode;
  children: ReactNode;
  openLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={openLabel}>
            <Menu className="h-5 w-5" />
          </Button>
        }
      />
      <SheetContent
        side="left"
        className="w-72 p-0 flex flex-col bg-surface"
      >
        <div className="border-b border-card-border p-4">{brand}</div>
        <div
          className="flex-1 overflow-y-auto p-3"
          onClick={(e) => {
            // close when a link is clicked
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
