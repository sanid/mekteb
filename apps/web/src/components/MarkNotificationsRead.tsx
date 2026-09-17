"use client";

import { useEffect } from "react";

import { markNotificationsRead } from "@/app/[locale]/notifications-shared/actions";

/**
 * Invisible component that marks all unread notifications as read
 * when mounted (i.e., when the notifications page is first visited).
 */
export function MarkNotificationsRead() {
  useEffect(() => {
    markNotificationsRead();
  }, []);
  return null;
}
