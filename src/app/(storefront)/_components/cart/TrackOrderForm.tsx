"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Search } from "lucide-react";
import { OrderDetails, type OrderView } from "./OrderStatus";

const inputCls =
  "mt-1.5 block w-full rounded-md border border-beige-300 bg-white px-3.5 py-2.5 text-[15px] focus:border-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-800/20";

/** Looks up an order by its number and the email it was placed with (POST /api/orders/lookup). */
export function TrackOrderForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderView | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const orderNumber = String(fd.get("orderNumber") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    if (!orderNumber || !email) {
      setError("Please enter your order number and the email address you ordered with.");
      return;
    }
    setBusy(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) setOrder(data.order);
      else setError(data.error ?? "We couldn't find an order with those details.");
    } catch {
      setError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-beige-300/80 bg-white p-6">
      <h2 className="font-serif text-2xl font-bold text-forest-800">Find Your Order</h2>
      <form onSubmit={onSubmit} noValidate className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="track-order-number" className="text-sm font-medium">Order number</label>
          <input id="track-order-number" name="orderNumber" required aria-required="true" autoComplete="off"
            placeholder="RSH-20261101-A1B2C3" className={inputCls} />
        </div>
        <div>
          <label htmlFor="track-email" className="text-sm font-medium">Email address</label>
          <input id="track-email" name="email" type="email" required aria-required="true" autoComplete="email"
            placeholder="you@example.com" className={inputCls} />
        </div>
        <button type="submit" disabled={busy}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-forest-800 px-6 font-semibold text-white hover:bg-forest-950 disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
          Track Order
        </button>
      </form>
      <div aria-live="polite" className="mt-5 empty:hidden">
        {error && (
          <p role="alert" className="flex gap-2 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden /> {error}
          </p>
        )}
        {order && <OrderDetails order={order} />}
      </div>
    </div>
  );
}
