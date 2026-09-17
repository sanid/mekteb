import { createContext, useContext } from "react";
import type { Session } from "./session";
import { defaultLocale, type Locale } from "@mekteb/i18n";

type SessionContextValue = {
  session: Session | null;
  refresh: () => Promise<void>;
  setSession: (s: Session | null) => void;
  /**
   * The active language. Held here rather than only in the i18n module because
   * `tm()` reads module state at call time — without a state change to render
   * against, switching language would leave every screen showing the old one
   * until it happened to re-render.
   */
  locale: Locale;
  changeLocale: (locale: Locale) => void;
};

export const SessionContext = createContext<SessionContextValue>({
  session: null,
  refresh: async () => {},
  setSession: () => {},
  locale: defaultLocale,
  changeLocale: () => {},
});

export function useSession() {
  return useContext(SessionContext);
}
