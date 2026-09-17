import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Amiri_Quran } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { routing } from "@/i18n/routing";
import { CLIENT_NAMESPACES } from "@/i18n/client-namespaces";
import ThemeProvider from "@/components/ThemeProvider";
import { BrandingCookieSync } from "@/components/BrandingCookieSync";
import { CookieNotice } from "@/components/CookieNotice";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Quranic text is set in Amiri Quran, not the UI font.
 *
 * Amiri is a Naskh revival of the Bulaq type; the `Quran` cut is the one drawn
 * for Quranic typesetting, so the vowel marks and pause signs sit where a
 * reader expects rather than colliding with the letterforms — which is what a
 * generic `font-serif` fallback does. It ships one weight (400) by design.
 */
const amiriQuran = Amiri_Quran({
  variable: "--font-amiri-quran",
  subsets: ["arabic"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mekteb",
  description: "Mosque education and community platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mekteb",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as "de" | "en" | "bs" | "tr")) {
    notFound();
  }

  // Providing all messages to the client
  const allMessages = await getMessages();
  const messages = Object.fromEntries(
    CLIENT_NAMESPACES.filter((ns) => ns in allMessages).map((ns) => [ns, allMessages[ns]]),
  );

  // Try to load mosque branding for the authenticated user
  let primaryColor: string | null = null;
  let secondaryColor: string | null = null;
  try {
    const cookieStore = await cookies();
    const cachedColor = cookieStore.get("mosque_primary_color")?.value;
    const cachedSecondary = cookieStore.get("mosque_secondary_color")?.value;
    if (cachedColor) {
      primaryColor = cachedColor;
      secondaryColor = cachedSecondary ?? null;
    } else {
      // Only check auth/database if there is a session cookie
      const hasSession = cookieStore.getAll().some(c => c.name.startsWith("sb-"));
      if (hasSession) {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const [membershipsResult, studentProfileResult] = await Promise.all([
            supabase
              .from("memberships")
              .select("mosque_id")
              .eq("user_id", user.id)
              .eq("is_active", true)
              .limit(1),
            supabase
              .from("student_profiles")
              .select("mosque_id")
              .eq("profile_id", user.id)
              .eq("is_active", true)
              .maybeSingle(),
          ]);
          const mosqueId =
            membershipsResult.data?.[0]?.mosque_id ??
            studentProfileResult.data?.mosque_id;
          if (mosqueId) {
            const { data: branding } = await supabase
              .from("mosque_branding")
              .select("primary_color, secondary_color")
              .eq("mosque_id", mosqueId)
              .maybeSingle();
            primaryColor = branding?.primary_color ?? null;
            secondaryColor = branding?.secondary_color ?? null;
          }
        }
      }
    }
  } catch {
    // Not authenticated or branding not available — use defaults
  }

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${amiriQuran.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Inline blocking scripts — defined here (not in sub-components) so
            React 19 hoists them to <head> without the component-script warning. */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"){document.documentElement.classList.remove("dark")}else if(t==="dark"){document.documentElement.classList.add("dark")}else if(window.matchMedia("(prefers-color-scheme:dark)").matches){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}}catch(e){}})()` }}
        />
        {(primaryColor || secondaryColor) && (
          <>
            {/* Mosque brand colours as CSS custom properties. A <style> tag,
                not an inline <script>: React never executes scripts it renders
                on the client, and the vars must be in place before first paint
                to avoid a colour flash. Scoped with `:has([data-portal])` so
                they only apply while a portal (PortalShell) is on screen — the
                public pages keep the default Mekteb green, including after a
                client-side navigation out of a portal. `html:root` outranks
                globals.css's `:root` regardless of style-sheet order. The cache
                cookie is refreshed by <BrandingCookieSync /> below. */}
            <style>
              {`html:root:has([data-portal]){${
                [
                  primaryColor
                    ? `--primary:${primaryColor};--accent:${primaryColor};`
                    : "",
                  secondaryColor ? `--secondary:${secondaryColor};` : "",
                ].join("")
              }}`}
            </style>
            <BrandingCookieSync primary={primaryColor} secondary={secondaryColor} />
          </>
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>{children}</ThemeProvider>
          <CookieNotice />
          <Toaster richColors position="top-right" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
