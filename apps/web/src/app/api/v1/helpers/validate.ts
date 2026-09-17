import { z } from "zod";

import { badRequest } from "./response";

export async function parseJson<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<
  | { ok: true; data: z.infer<T> }
  | { ok: false; response: ReturnType<typeof badRequest> }
> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: badRequest("Invalid JSON body") };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first.path.length ? first.path.join(".") : "body";
    return {
      ok: false,
      response: badRequest(`${path}: ${first.message}`, "validation_failed"),
    };
  }
  return { ok: true, data: result.data };
}

export function parseQuery<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
):
  | { ok: true; data: z.infer<T> }
  | { ok: false; response: ReturnType<typeof badRequest> } {
  const url = new URL(request.url);
  const obj: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) obj[k] = v;
  const result = schema.safeParse(obj);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first.path.length ? first.path.join(".") : "query";
    return {
      ok: false,
      response: badRequest(`${path}: ${first.message}`, "validation_failed"),
    };
  }
  return { ok: true, data: result.data };
}

const intLike = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "number" ? v : parseInt(v, 10)))
  .refine((n) => Number.isFinite(n), "must be a number");

export const paginationSchema = z.object({
  limit: intLike.pipe(z.number().int().min(1).max(200)).default(50).optional(),
  cursor: z.string().optional(),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function escapeLikeWildcards(s: string): string {
  return s.replace(/([%_\\])/g, "\\$1");
}
