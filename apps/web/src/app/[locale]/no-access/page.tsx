import { signOut } from "../login/actions";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";

export default async function NoAccess() {
  const t = await getTranslations("Auth");
  return (
    <main className="flex-1 grid place-items-center p-8">
      <div className="max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-subtle">
          <svg
            className="h-7 w-7 text-danger-fg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold">{t("noAccess")}</h1>
        <p className="text-muted">
          {t("noAccessDesc")}
        </p>
        <form action={signOut}>
          <button className={buttonVariants({ variant: "outline", size: "xl" })}>
            {t("signOut")}
          </button>
        </form>
      </div>
    </main>
  );
}
