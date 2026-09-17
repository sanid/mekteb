import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { buttonVariants } from "@/components/ui/button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "404 — Mekteb",
  description: "The page you're looking for doesn't exist or may have moved.",
};

const copy: Record<string, { title: string; description: string; home: string }> = {
  de: {
    title: "Seite nicht gefunden",
    description: "Die gesuchte Seite existiert nicht oder wurde verschoben.",
    home: "Zur Startseite",
  },
  en: {
    title: "Page not found",
    description: "The page you're looking for doesn't exist or may have moved.",
    home: "Go home",
  },
  bs: {
    title: "Stranica nije pronađena",
    description: "Stranica koju tražite ne postoji ili je premještena.",
    home: "Na početnu",
  },
  tr: {
    title: "Sayfa bulunamadı",
    description: "Aradığınız sayfa mevcut değil veya taşınmış olabilir.",
    home: "Ana sayfaya git",
  },
};

type Locale = (typeof routing.locales)[number];

async function detectLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  if (cookieLocale && (routing.locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale as Locale;
  }

  const acceptLanguage = (await headers()).get("accept-language") ?? "";
  for (const part of acceptLanguage.split(",")) {
    const lang = part.trim().split(";")[0]?.split("-")[0];
    if (lang && (routing.locales as readonly string[]).includes(lang)) {
      return lang as Locale;
    }
  }

  return routing.defaultLocale;
}

export default async function GlobalNotFound() {
  const locale = await detectLocale();
  const t = copy[locale] ?? copy[routing.defaultLocale];
  const homeHref = locale === routing.defaultLocale ? "/" : `/${locale}`;
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"){document.documentElement.classList.remove("dark")}else if(t==="dark"){document.documentElement.classList.add("dark")}else if(window.matchMedia("(prefers-color-scheme:dark)").matches){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="h-full bg-background text-foreground">
        <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-12 w-12 text-accent mb-6"
          >
            <path fillRule="evenodd" d="M5 21.5V13.8A11 11 0 0 1 12 3.55A11 11 0 0 1 19 13.8V21.5Z M7.6 21.5V13.8A8.4 8.4 0 0 1 12 6.41A8.4 8.4 0 0 1 16.4 13.8V21.5Z" />
            <circle cx="12" cy="1.55" r="1.15" />
          </svg>
          <p className="font-mono text-sm text-muted mb-2">404</p>
          <h1 className="text-2xl font-semibold mb-2">{t.title}</h1>
          <p className="text-muted mb-6 max-w-sm">{t.description}</p>
          <a
            href={homeHref}
            className={buttonVariants({ size: "xl" })}
          >
            {t.home}
          </a>
        </main>
      </body>
    </html>
  );
}
