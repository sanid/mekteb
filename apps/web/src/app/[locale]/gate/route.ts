import { NextRequest, NextResponse } from "next/server";

import { checkGatePassword, GATE_COOKIE } from "@/lib/site-gate";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/");

  const token = checkGatePassword(password);
  if (token) {
    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    response.cookies.set(GATE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    return response;
  }

  const url = new URL(request.url);
  url.pathname = redirectTo;
  url.searchParams.set("gate_error", "1");
  return NextResponse.redirect(url);
}
