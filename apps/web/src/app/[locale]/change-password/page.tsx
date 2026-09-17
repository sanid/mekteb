import { requireUser } from "@/lib/auth";

import ChangePasswordForm from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  // requireUser redirects to /login if no session, but does NOT redirect on
  // must_rotate_password so that this page remains reachable.
  const user = await requireUser();

  return (
    <main className="flex-1 grid place-items-center p-8">
      <ChangePasswordForm firstLogin={user.mustRotatePassword} />
    </main>
  );
}
