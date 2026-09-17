"use client";

import { useSyncExternalStore } from "react";

// The store never changes after hydration, so subscribe is a no-op.
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * `false` during SSR and the first client render, `true` afterwards.
 *
 * Use this to gate anything that depends on browser-only state
 * (`localStorage`, `matchMedia`, the resolved theme) so the server and the
 * first client render agree. Unlike the `useState` + `useEffect` "mounted"
 * idiom this does not schedule a second render pass from inside an effect.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
