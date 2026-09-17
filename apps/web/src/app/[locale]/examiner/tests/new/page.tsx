import { getTranslations, getLocale } from "next-intl/server";
import { fetchQuestionsAndTopics } from "./actions";
import TestBuilder from "./TestBuilder";
import { PageHeader } from "@/components/PageHeader";

export default async function NewWrittenTestPage() {
  const t = await getTranslations("WrittenTests");
  const locale = await getLocale();
  const { questions, topics } = await fetchQuestionsAndTopics();

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title={t("newTest")} description={t("newTestSub")} />
      <TestBuilder questions={questions} topics={topics} locale={locale} />
    </div>
  );
}
