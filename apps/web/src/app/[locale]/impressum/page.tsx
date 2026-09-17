import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { operatorConfig } from "@/lib/operator-config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Impressum");
  return { title: `${t("title")} — Mekteb` };
}

/**
 * Impressum / Anbieterkennzeichnung gemäß § 5 TMG.
 * Per German law this disclosure is provided in German regardless of the
 * site's UI locale — the back-link label is the only translated string.
 */
export default async function ImpressumPage() {
  const t = await getTranslations("Impressum");

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

      <h1 className="text-3xl font-semibold tracking-tight mb-8">Impressum</h1>

      <div className="space-y-8 text-foreground">
        <section>
          <h2 className="text-xl font-semibold mb-3">
            Angaben gemäß § 5 TMG
          </h2>
          <address className="not-italic leading-relaxed">
            {operatorConfig.name}
            <br />
            {operatorConfig.street}
            <br />
            {operatorConfig.postalCity}
            <br />
            {operatorConfig.country}
          </address>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Kontakt</h2>
          <p className="leading-relaxed">
            E-Mail:{" "}
            <a
              href={`mailto:${operatorConfig.email}`}
              className="text-accent hover:underline"
            >
              {operatorConfig.email}
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
          </h2>
          <address className="not-italic leading-relaxed">
            {operatorConfig.name}
            <br />
            {operatorConfig.street}
            <br />
            {operatorConfig.postalCity}
          </address>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            EU-Streitschlichtung
          </h2>
          <p className="leading-relaxed text-sm text-muted">
            Die Europäische Kommission stellt eine Plattform zur
            Online-Streitbeilegung (OS) bereit:{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
            . Meine E-Mail-Adresse finden Sie oben im Impressum.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            Verbraucherstreitbeilegung / Universalschlichtungsstelle
          </h2>
          <p className="leading-relaxed text-sm text-muted">
            Ich bin nicht bereit oder verpflichtet, an
            Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Haftung für Inhalte</h2>
          <p className="leading-relaxed text-sm text-muted">
            Als Diensteanbieter bin ich gemäß § 7 Abs.1 TMG für eigene
            Inhalte auf diesen Seiten nach den allgemeinen Gesetzen
            verantwortlich. Nach §§ 8 bis 10 TMG bin ich als Diensteanbieter
            jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
            Informationen zu überwachen oder nach Umständen zu forschen, die
            auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur
            Entfernung oder Sperrung der Nutzung von Informationen nach den
            allgemeinen Gesetzen bleiben hiervon unberührt. Eine
            diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der
            Kenntnis einer konkreten Rechtsverletzung möglich. Bei
            Bekanntwerden von entsprechenden Rechtsverletzungen werde ich
            diese Inhalte umgehend entfernen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Haftung für Links</h2>
          <p className="leading-relaxed text-sm text-muted">
            Mein Angebot enthält Links zu externen Websites Dritter, auf
            deren Inhalte ich keinen Einfluss habe. Deshalb kann ich für
            diese fremden Inhalte auch keine Gewähr übernehmen. Für die
            Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
            oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten
            wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße
            überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der
            Verlinkung nicht erkennbar. Eine permanente inhaltliche
            Kontrolle der verlinkten Seiten ist jedoch ohne konkrete
            Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
            Bekanntwerden von Rechtsverletzungen werde ich derartige Links
            umgehend entfernen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Urheberrecht</h2>
          <p className="leading-relaxed text-sm text-muted">
            Die durch den Seitenbetreiber erstellten Inhalte und Werke auf
            diesen Seiten unterliegen dem deutschen Urheberrecht. Die
            Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
            Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der
            schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            Downloads und Kopien dieser Seite sind nur für den privaten,
            nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf
            dieser Seite nicht vom Betreiber erstellt wurden, werden die
            Urheberrechte Dritter beachtet. Insbesondere werden Inhalte
            Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine
            Urheberrechtsverletzung aufmerksam werden, bitte ich um einen
            entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen
            werde ich derartige Inhalte umgehend entfernen.
          </p>
        </section>
      </div>
      </main>
      <PublicFooter />
    </>
  );
}
