"use client";

import { useEffect } from "react";

/**
 * Saves a signed-in customer's cart and wishlist to their account (see _lib/account-sync). The sync code
 * loads after the page, so it never delays the first paint.
 */
export function AccountSync() {
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    import("@storefront/_lib/account-sync").then(({ startAccountSync }) => {
      if (!cancelled) stop = startAccountSync();
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);
  return null;
}
