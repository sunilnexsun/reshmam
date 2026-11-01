"use client";

import { useEffect } from "react";

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * Saves a signed-in customer's cart and wishlist to their account (see _lib/account-sync). The sync code and
 * the Supabase client load only when customer accounts are configured, so guests' pages stay light.
 */
export function AccountSync() {
  useEffect(() => {
    if (!configured) return;
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
