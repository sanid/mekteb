import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Terms");
  return { title: `${t("title")} — Mekteb` };
}

export default async function TermsPage() {
  const t = await getTranslations("Terms");

  return (
    <>
      <PublicHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-4 sm:px-6 py-12">
        <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-8 transition-colors"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        {t("back")}
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight mb-2">{t("title")}</h1>
      <p className="text-sm text-muted mb-8">{t("lastUpdated")}</p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-semibold mb-3">{t("s1_title")}</h2>
          <p className="text-muted leading-relaxed">{t("s1_body")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("s2_title")}</h2>
          <p className="text-muted leading-relaxed">{t("s2_body")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("s3_title")}</h2>
          <p className="text-muted leading-relaxed">{t("s3_body")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("s4_title")}</h2>
          <p className="text-muted leading-relaxed">{t("s4_body")}</p>
          <ul className="mt-3 space-y-1.5 text-muted list-disc list-inside">
            <li>{t("s4_item1")}</li>
            <li>{t("s4_item2")}</li>
            <li>{t("s4_item3")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("s5_title")}</h2>
          <p className="text-muted leading-relaxed">{t("s5_body")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("s6_title")}</h2>
          <p className="text-muted leading-relaxed">{t("s6_body")}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("s7_title")}</h2>
          <p className="text-muted leading-relaxed">{t("s7_body")}</p>
        </section>
      </div>
      </main>
      <PublicFooter />
    </>
  );
}
