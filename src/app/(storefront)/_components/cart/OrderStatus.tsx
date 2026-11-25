"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, Check, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { statusLabel, stepIndex, trackingSteps } from "@storefront/_lib/order-status";
import { formatINR } from "@storefront/_lib/pricing";
import { cart } from "@storefront/_lib/store";
import { ButtonLink, cn } from "@storefront/_components/ui/primitives";

export type OrderView = {
  orderNumber: string;
  status: string;
  paymentMethod: "online" | "cod";
  paymentStatus: string;
  subtotal: number;
  discount?: number;
  couponCode?: string;
  shipping: number;
  total: number;
  createdAt: string;
  customerName?: string;
  items: { product_name: string; variant_label: string; quantity: number; line_total_inr: number }[];
};

/** Step-by-step progress line for orders in the delivery flow. */
export function TrackingTimeline({ status }: { status: string }) {
  const current = stepIndex(status);
  if (current < 0) return null;
  return (
    <ol className="mt-5 space-y-0" aria-label="Delivery progress">
      {trackingSteps.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
            {i < trackingSteps.length - 1 && (
              <span
                aria-hidden
                className={cn("absolute left-[11px] top-6 h-full w-0.5", i < current ? "bg-leaf-600" : "bg-beige-300")}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                done ? "border-leaf-600 bg-leaf-600 text-white" : "border-beige-300 bg-white",
              )}
            >
              {done && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
            </span>
            <span className="text-sm">
              <span className={cn("block font-semibold", done ? "text-forest-900" : "text-ink-soft")}>
                {step.label}
                {i === current && <span className="sr-only"> (current status)</span>}
              </span>
              <span className="text-ink-soft">{step.text}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderDetails({ order }: { order: OrderView }) {
  return (
    <div className="rounded-xl border border-beige-300/80 bg-white p-6">
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-soft">Order number</dt>
          <dd className="font-semibold">{order.orderNumber}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Status</dt>
          <dd className="font-semibold text-forest-800">{statusLabel(order.status)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Payment</dt>
          <dd className="font-semibold">{order.paymentMethod === "cod" ? "Cash on Delivery" : `Online (${order.paymentStatus})`}</dd>
        </div>
      </dl>
      <TrackingTimeline status={order.status} />
      <ul className="mt-5 divide-y divide-beige-300 border-y border-beige-300 text-sm">
        {order.items.map((i, idx) => (
          <li key={idx} className="flex justify-between py-2">
            <span>
              {i.product_name} ({i.variant_label}) × {i.quantity}
            </span>
            <span>{formatINR(i.line_total_inr)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
        {(order.discount ?? 0) > 0 && (
          <div className="flex justify-between text-leaf-600 font-medium">
            <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
            <dd>−{formatINR(order.discount!)}</dd>
          </div>
        )}
        <div className="flex justify-between"><dt>Delivery</dt><dd>{order.shipping ? formatINR(order.shipping) : "Free"}</dd></div>
        <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div>
      </dl>
    </div>
  );
}

/** While a payment is unconfirmed, re-check every POLL_MS, for up to POLL_LIMIT checks (2 minutes). */
const POLL_MS = 5000;
const POLL_LIMIT = 24;

export function OrderConfirmation() {
  const params = useSearchParams();
  const orderNumber = params.get("order");
  const token = params.get("token");
  const [state, setState] = useState<{ loading: boolean; order?: OrderView; error?: string; stalled?: boolean }>({
    loading: true,
  });

  useEffect(() => {
    if (!orderNumber || !token) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let checks = 0;
    const load = () => {
      checks++;
      fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, token }),
      })
        .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
        .then(({ ok, data }) => {
          if (cancelled) return;
          if (ok && data.ok) {
            const pending = data.order.status === "pending_payment";
            setState({ loading: false, order: data.order, stalled: pending && checks >= POLL_LIMIT });
            if (!pending && data.order.status !== "payment_failed") cart.clear();
            if (pending && checks < POLL_LIMIT) timer = setTimeout(load, POLL_MS);
          } else {
            // Keep showing the order if a later check fails; only an initial failure is an error.
            setState((s) => (s.order ? s : { loading: false, error: data.error ?? "We couldn't load this order." }));
          }
        })
        .catch(() => {
          if (cancelled) return;
          setState((s) => (s.order ? s : { loading: false, error: "We couldn't reach the server." }));
          if (checks < POLL_LIMIT) timer = setTimeout(load, POLL_MS);
        });
    };
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderNumber, token]);

  if (!orderNumber || !token) {
    return <p className="text-ink-soft">No order to show. <Link href="/products" className="underline">Continue shopping</Link>.</p>;
  }
  if (state.loading) {
    return (
      <p className="flex items-center gap-2 text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading your order…
      </p>
    );
  }
  if (state.error || !state.order) {
    return (
      <p role="alert" className="flex gap-2 rounded-md border border-red-300 bg-red-50 p-4 text-red-800">
        <AlertCircle className="h-5 w-5" aria-hidden /> {state.error}
      </p>
    );
  }
  const o = state.order;
  const pending = o.status === "pending_payment";
  const failed = o.status === "payment_failed";
  const cancelled = o.status === "cancelled";
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        {pending ? (
          <Clock className="h-8 w-8 shrink-0 text-gold-700" aria-hidden />
        ) : failed || cancelled ? (
          <AlertCircle className="h-8 w-8 shrink-0 text-red-700" aria-hidden />
        ) : (
          <CheckCircle2 className="h-8 w-8 shrink-0 text-leaf-600" aria-hidden />
        )}
        <div>
          <h2 className="font-serif text-2xl font-bold text-forest-800">
            {pending ? "Waiting for payment confirmation" : failed ? "Payment not completed" : cancelled ? "This order was cancelled" : "Thank you for your order!"}
          </h2>
          <p className="mt-1 text-ink-soft">
            {pending && state.stalled
              ? `We still haven't received confirmation of your payment. Please don't pay again: if money was taken, contact us with order number ${o.orderNumber} and we'll sort it out.`
              : pending
              ? "We haven't received confirmation of your payment yet. This page updates by itself once it's verified — please don't pay twice."
              : failed
                ? "Your payment did not complete. You can return to your cart and try again."
                : cancelled
                  ? `If you have any questions about this, contact us with order number ${o.orderNumber}.`
                  : "We've received your order and will contact you with delivery details."}
          </p>
        </div>
      </div>
      <OrderDetails order={o} />
      <ButtonLink href="/products" variant="outline">Continue Shopping</ButtonLink>
    </div>
  );
}
