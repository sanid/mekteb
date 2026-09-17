import { NextResponse } from "next/server";

import { openapiSpec } from "@/lib/api-docs/openapi";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(openapiSpec, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
