import { NextResponse } from "next/server";

import { sanitizeDbMessage } from "@/lib/db-error";

type JsonInit = { status?: number; noStore?: boolean };

function build(body: unknown, init: JsonInit = {}) {
  const headers: Record<string, string> = {};
  if (init.noStore) headers["Cache-Control"] = "no-store";
  return NextResponse.json(body, { status: init.status ?? 200, headers });
}

export function ok<T>(data?: T, status = 200) {
  return build({ ok: true, data: (data as unknown) ?? null }, { status });
}

export function okNoStore<T>(data?: T, status = 200) {
  return build({ ok: true, data: (data as unknown) ?? null }, {
    status,
    noStore: true,
  });
}

export function err(error: string, status = 400, code?: string) {
  return build({ ok: false, error, code }, { status });
}

export function unauthorized(msg = "Unauthorized") {
  return err(msg, 401, "unauthorized");
}

export function forbidden(msg = "Forbidden") {
  return err(msg, 403, "forbidden");
}

export function notFound(msg = "Not found") {
  return err(msg, 404, "not_found");
}

export function badRequest(msg = "Bad request", code?: string) {
  return err(msg, 400, code ?? "bad_request");
}

export function tooMany(msg = "Too many requests", retryAfterMs?: number) {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (retryAfterMs && retryAfterMs > 0) {
    headers["Retry-After"] = String(Math.ceil(retryAfterMs / 1000));
  }
  return NextResponse.json(
    { ok: false, error: msg, code: "rate_limited" },
    { status: 429, headers },
  );
}

export function dbErr(raw: string | undefined, status = 400, code?: string) {
  return err(sanitizeDbMessage(raw, "api"), status, code);
}
