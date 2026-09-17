import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent worktrees are full copies of the repo — linting them double-reports
    // every finding and can surface errors from stale checkouts.
    ".claude/**",
  ]),
  {
    // One-off Node build scripts are plain CommonJS, not app code.
    files: ["supabase/scripts/**/*.js", "scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/format.ts", "src/components/demo/**"],
    rules: {
      // A toLocale*String() with no locale — or an explicit `undefined` —
      // falls back to the *runtime's* locale: Node's on the server, the
      // browser's on the client. That renders German dates for Bosnian users
      // and can differ between SSR and hydration. Passing a resolved tag
      // (e.g. from dateFormatLocale) is fine and is not flagged.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[arguments.length=0] > MemberExpression[property.name=/^toLocale(Date|Time)?String$/]",
          message:
            "Bare toLocale*String() uses the runtime locale. Use formatDate / formatDateShort / formatDateTime / formatTime from @/lib/format with the active locale (getLocale() server-side, useLocale() client-side).",
        },
        {
          // The Identifier guard matters: without it, esquery treats the
          // missing `.name` on a string-literal argument as a match and this
          // also fires on legitimate toLocaleDateString("de-DE", …) calls.
          selector:
            "CallExpression[arguments.0.type='Identifier'][arguments.0.name='undefined'] > MemberExpression[property.name=/^toLocale(Date|Time)?String$/]",
          message:
            "Passing `undefined` as the locale falls back to the runtime locale. Use @/lib/format with the active locale instead.",
        },
      ],
    },
  },
]);

export default eslintConfig;
