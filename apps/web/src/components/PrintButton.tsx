"use client";
import { useEffect } from "react";
import { Printer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function PrintButton({ label }: { label: string }) {
  useEffect(() => {
    window.print();
  }, []);

  return (
    <button
      onClick={() => window.print()}
      className={buttonVariants({ size: "xl" })}
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}
