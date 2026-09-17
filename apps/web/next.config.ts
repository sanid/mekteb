import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin();

// CSP is set dynamically per-request in proxy.ts (nonce-based).
// Only static security headers live here.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Public libraries on subdomains are testable locally as
  // http://{subdomain}.localhost:3000.
  allowedDevOrigins: ["*.localhost"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    return [
      {
        source: "/docs",
        destination: "/docs/index.html",
        permanent: true,
      },
      {
        source: "/devdocumentation",
        destination: "/devdocumentation/index.html",
        permanent: true,
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
    globalNotFound: true,
  },
  serverExternalPackages: [
    "@blocknote/core",
    "@blocknote/react",
    "@blocknote/server-util",
  ],
};

import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const config = withPWA(withNextIntl(nextConfig));

export default withSentryConfig(config, {
  // Sentry project slugs — set SENTRY_ORG and SENTRY_PROJECT env vars at build time.
  silent: !process.env.CI,
  // Disable source map upload when DSN isn't configured (local dev).
  sourcemaps: {
    disable: !process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
  // Tree-shake Sentry logger statements in production.
  disableLogger: true,
  // Automatically instrument Next.js data-fetching methods and route handlers.
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
});
