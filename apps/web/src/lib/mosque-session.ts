import { cookies } from "next/headers";

const COOKIE_NAME = "mekteb_mosque";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function getActiveMosqueCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value;
}

export async function setActiveMosqueCookie(id: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    path: "/",
    maxAge: MAX_AGE,
    sameSite: "lax",
  });
}
