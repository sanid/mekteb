import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

import { updateSession } from "@/lib/supabase/middleware";
import { resolveLibrarySubdomain, subdomainFromHost } from "@/lib/library-host";

const handleI18nRouting = createIntlMiddleware(routing);

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: https: ${supabaseOrigin}`,
    "font-src 'self' data: https://fonts.scalar.com",
    // Quran recitation audio is streamed from the islamic.network CDN.
    `media-src 'self' blob: https://cdn.islamic.network ${supabaseOrigin}`,
    `connect-src 'self' https: wss: ${supabaseOrigin}`,
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

// On the SaaS deployment, each mosque is reached via {slug}.mekteb.de.
// We read the subdomain from the host header and inject x-mosque-slug so
// server components can resolve the mosque_id without another DB round-trip.
// On self-hosted deployments (no subdomain) this is a no-op.
function injectMosqueSlug(request: NextRequest, headers: Headers) {
  const host = request.headers.get("host") ?? "";
  const rootDomain = process.env.ROOT_DOMAIN ?? "mekteb.de";
  const subdomain = host.endsWith(`.${rootDomain}`)
    ? host.slice(0, host.length - rootDomain.length - 1)
    : null;
  if (subdomain && subdomain !== "www") {
    headers.set("x-mosque-slug", subdomain);
  }
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  let response = handleI18nRouting(request);

  // A public library on its own subdomain (ilmihal-ikb.mekteb.de): serve
  // every localized path from /{locale}/library/{slug}/…
  const sub = subdomainFromHost(request.headers.get("host") ?? "");
  const librarySlug = sub ? await resolveLibrarySubdomain(sub) : null;
  if (librarySlug && !response.headers.has("location")) {
    const [, locale, ...rest] = request.nextUrl.pathname.split("/");
    const tail = rest.join("/");
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/library/${librarySlug}${tail ? `/${tail}` : ""}`;
    const rewritten = NextResponse.rewrite(url);
    for (const cookie of response.cookies.getAll()) rewritten.cookies.set(cookie);
    // Keep next-intl's forwarded request headers (the active locale).
    response.headers.forEach((value, key) => {
      if (key.startsWith("x-middleware-request-") || key === "x-middleware-override-headers") {
        rewritten.headers.set(key, value);
      }
    });
    response = rewritten;
  }

  const final = await updateSession(request, response);

  // Inject x-nonce and x-mosque-slug into forwarded request headers so
  // server components can read them via headers().
  const existing = final.headers.get("x-middleware-override-headers");
  const overrideList = existing ? existing.split(",").map((h) => h.trim()) : [];
  const extraHeaders = new Headers(request.headers);
  if (librarySlug) {
    // Tells the library pages to build links without the /library/{slug} prefix.
    overrideList.push("x-library-host");
    final.headers.set("x-middleware-request-x-library-host", "1");
  } else {
    injectMosqueSlug(request, extraHeaders);
  }
  if (!overrideList.includes("x-nonce")) overrideList.push("x-nonce");
  if (extraHeaders.has("x-mosque-slug") && !overrideList.includes("x-mosque-slug")) {
    overrideList.push("x-mosque-slug");
    final.headers.set("x-middleware-request-x-mosque-slug", extraHeaders.get("x-mosque-slug")!);
  }
  final.headers.set("x-middleware-override-headers", overrideList.join(","));
  final.headers.set("x-middleware-request-x-nonce", nonce);

  final.headers.set("Content-Security-Policy", csp);
  return final;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|docs/.*|devdocumentation/.*|api/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|html)$).*)",
  ],
};
