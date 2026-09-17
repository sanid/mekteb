import { NextRequest } from "next/server";

import { loadSession } from "@/app/api/v1/helpers/session";
import { okNoStore, unauthorized } from "@/app/api/v1/helpers/response";

export async function GET(request: NextRequest) {
  const session = await loadSession(request);
  if (!session) return unauthorized("Not authenticated");
  return okNoStore(session);
}
