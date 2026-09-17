import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import LandingPage from "./LandingPage";
import { GATE_COOKIE, hasGateAccess } from "@/lib/site-gate";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ gate_error?: string }>;
}) {
  const store = await cookies();
  const hasAccess = hasGateAccess(store.get(GATE_COOKIE)?.value);

  if (!hasAccess) {
    const { gate_error } = await searchParams;
    // The form has to post back into the *current* locale: hardcoding /de sent
    // an English or Bosnian visitor to the German page on success.
    const locale = await getLocale();
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-xs space-y-5 rounded-xl border border-card-border bg-card p-8 shadow-lg">
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-semibold tracking-tight">Mekteb</h1>
            <p className="text-sm text-muted">Enter password to continue</p>
          </div>

          <form method="POST" action={`/${locale}/gate`} className="space-y-4">
            <input type="hidden" name="redirect" value={`/${locale}`} />
            <input
              type="password"
              name="password"
              autoFocus
              placeholder="Password"
              className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
            />
            {gate_error && (
              <p className="text-xs text-danger text-center">Incorrect password.</p>
            )}
            <button
              type="submit"
              className={cn(buttonVariants({ size: "xl" }), "w-full")}
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <LandingPage />;
}
