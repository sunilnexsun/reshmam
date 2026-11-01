"use client";

import { useEffect, useMemo, useState } from "react";
import { applyLiveToProduct, type LiveVariants } from "./live";
import type { Product } from "./products";

// One request per page load, shared by every component that shows stock or prices.
let request: Promise<LiveVariants | null> | null = null;
function loadLive() {
  request ??= fetch("/api/catalogue/live")
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { variants: LiveVariants | null } | null) => d?.variants ?? null)
    .catch(() => null);
  return request;
}

/**
 * Live stock and prices, or null while loading / when the database isn't configured. The first render uses
 * the catalogue (matching the server HTML); live values replace them once loaded.
 */
export function useLiveVariants() {
  const [live, setLive] = useState<LiveVariants | null>(null);
  useEffect(() => {
    let active = true;
    loadLive().then((l) => active && setLive(l));
    return () => {
      active = false;
    };
  }, []);
  return live;
}

/** The product with live stock and prices applied to its variants. */
export function useLiveProduct(product: Product) {
  const live = useLiveVariants();
  return useMemo(() => applyLiveToProduct(product, live), [product, live]);
}
