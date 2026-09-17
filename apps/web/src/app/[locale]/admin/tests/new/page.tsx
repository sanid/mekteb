import { getTranslations, getLocale } from "next-intl/server";
import { HelpCircle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { fetchAdminQuestionsAndTopics } from "./actions";
import TestBuilder from "@/app/[locale]/examiner/tests/new/TestBuilder";
import { PageHeader } from "@/components/PageHeader";

export default async function AdminNewTestPage() {
  const t = await getTranslations("WrittenTests");
  const locale = await getLocale();
  const { questions, topics } = await fetchAdminQuestionsAndTopics();

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={t("newTest")}
        description={t("newTestSub")}
        actions={
          <Link
            href="/admin/questions"
            className="flex items-start gap-2.5 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 hover:bg-accent/10 hover:border-accent/60 transition-colors shrink-0 max-w-56 group"
          >
            <HelpCircle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium leading-tight text-accent group-hover:underline">{t("questionBank")}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{t("questionBankCardSub")}</p>
            </div>
          </Link>
        }
      />
      <TestBuilder
        questions={questions}
        topics={topics}
        locale={locale}
        pdfRoute={`/${locale}/admin/tests/pdf`}
      />
    </div>
  );
}
