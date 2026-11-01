"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ChevronDown, Loader2, Package } from "lucide-react";
import { statusLabel } from "@storefront/_lib/order-status";
import { formatINR } from "@storefront/_lib/pricing";
import { OrderDetails, type OrderView } from "@storefront/_components/cart/OrderStatus";

type State = { kind: "loading" } | { kind: "error"; text: string } | { kind: "ready"; orders: OrderView[] };

const orderDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** The signed-in customer's orders, newest first (GET /api/account/orders). */
export function OrderHistory({ accessToken }: { accessToken: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/orders", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.ok) setState({ kind: "ready", orders: data.orders });
        else setState({ kind: "error", text: data.error ?? "We couldn't load your orders. Please try again." });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error", text: "We couldn't reach the server. Please check your connection." });
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <section aria-labelledby="order-history-title" className="space-y-4">
      <h2 id="order-history-title" className="font-serif text-2xl font-bold text-forest-800">My Orders</h2>
      {state.kind === "loading" && (
        <p className="flex items-center gap-2 text-ink-soft">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading your orders…
        </p>
      )}
      {state.kind === "error" && (
        <p role="alert" className="flex gap-2 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden /> {state.text}
        </p>
      )}
      {state.kind === "ready" && state.orders.length === 0 && (
        <div className="rounded-xl border border-beige-300/80 bg-white p-6 text-center">
          <Package className="mx-auto h-8 w-8 text-forest-800" aria-hidden />
          <p className="mt-2 font-medium">You haven&apos;t placed any orders yet.</p>
          <p className="mt-1 text-sm text-ink-soft">
            Orders placed with this email address will appear here.{" "}
            <Link href="/products" className="font-semibold text-forest-800 underline">Browse our oils</Link>
          </p>
        </div>
      )}
      {state.kind === "ready" && state.orders.length > 0 && (
        <ul className="space-y-3">
          {state.orders.map((order) => (
            <li key={order.orderNumber}>
              <details className="group overflow-hidden rounded-xl border border-beige-300/80 bg-white open:border-forest-800/40">
                <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="font-semibold">{order.orderNumber}</span>
                  <span className="text-sm text-ink-soft">{orderDate(order.createdAt)}</span>
                  <span className="text-sm font-semibold text-forest-800">{statusLabel(order.status)}</span>
                  <span className="ml-auto font-semibold">{formatINR(order.total)}</span>
                  <ChevronDown className="h-5 w-5 text-ink-soft transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="border-t border-beige-300/80 [&>div]:rounded-none [&>div]:border-0">
                  <OrderDetails order={order} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
