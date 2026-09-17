import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { buttonVariants } from "@/components/ui/button";
import { MosqueIcon } from "@/components/icons";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <MosqueIcon className="h-12 w-12 text-accent mb-6" />
      <p className="font-mono text-sm text-muted mb-2">404</p>
      <h1 className="text-2xl font-semibold mb-2">{t("title")}</h1>
      <p className="text-muted mb-6 max-w-sm">{t("description")}</p>
      <Link
        href="/"
        className={buttonVariants({ size: "xl" })}
      >
        {t("home")}
      </Link>
    </main>
  );
}
