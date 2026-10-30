"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Banknote, CreditCard, Info, Loader2, Lock } from "lucide-react";
import { useCartLines } from "./useCartLines";
import { OrderSummary } from "./CartView";
import { checkoutSchema, fieldErrors, indianStates } from "@/lib/validation";
import { formatINR } from "@/lib/pricing";
import { site } from "@/lib/site";
import { ButtonLink, cn } from "../ui/primitives";

type Status = { ordering: boolean; onlinePayments: boolean } | null;

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const inputCls =
  "mt-1.5 block w-full rounded-md border bg-white px-3.5 py-2.5 text-[15px] focus:border-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-800/20";

export function CheckoutForm() {
  const router = useRouter();
  const { lines, subtotal } = useCartLines();
  const [state, setState] = useState<string>(site.shipping.homeState);
  const [method, setMethod] = useState<"online" | "cod">("online");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetch("/api/checkout/status")
      .then((r) => r.json())
      .then((s: { ordering: boolean; onlinePayments: boolean }) => {
        setStatus(s);
        if (!s.onlinePayments) setMethod("cod");
      })
      .catch(() => setStatus({ ordering: false, onlinePayments: false }));
  }, []);

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-beige-300 bg-white/70 p-10 text-center">
        <h2 className="font-serif text-2xl font-bold text-forest-800">Your cart is empty</h2>
        <p className="mt-2 text-ink-soft">Add some products before checking out.</p>
        <ButtonLink href="/products" className="mt-6">
          Shop Our Oils
        </ButtonLink>
      </div>
    );
  }

  const field = (name: string) => ({
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-err` : undefined,
    className: cn(inputCls, errors[name] ? "border-red-600" : "border-beige-300"),
  });
  const err = (name: string) =>
    errors[name] ? (
      <p id={`${name}-err`} className="mt-1 text-xs font-medium text-red-700">
        {errors[name]}
      </p>
    ) : null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? "").trim();
    const payload = {
      customer: { name: g("customer.name"), email: g("customer.email"), phone: g("customer.phone") },
      address: {
        line1: g("address.line1"),
        line2: g("address.line2") || undefined,
        city: g("address.city"),
        state: g("address.state"),
        pincode: g("address.pincode"),
      },
      paymentMethod: method,
      items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    };
    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      setErrors(errs);
      formRef.current?.querySelector<HTMLElement>(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data.fields) setErrors(data.fields);
        setError(data.error ?? "Something went wrong. Nothing was charged.");
        setBusy(false);
        return;
      }
      const confirmUrl = `/checkout/confirmation?order=${encodeURIComponent(data.orderNumber)}&token=${encodeURIComponent(data.token)}`;
      if (!data.razorpay) {
        router.push(confirmUrl);
        return;
      }
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        setError("The payment window could not be loaded. Please check your connection and try again.");
        setBusy(false);
        return;
      }
      const rzp = new window.Razorpay({
        key: data.razorpay.keyId,
        order_id: data.razorpay.orderId,
        amount: data.razorpay.amount,
        currency: data.razorpay.currency,
        name: "RESHMAM Natural Goodness",
        description: `Order ${data.orderNumber}`,
        prefill: { name: parsed.data.customer.name, email: parsed.data.customer.email, contact: parsed.data.customer.phone },
        theme: { color: "#064B2B" },
        handler: async (resp: Record<string, string>) => {
          // The server verifies the signature and payment status before marking the order paid.
          await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderNumber: data.orderNumber, token: data.token, ...resp }),
          }).catch(() => null);
          router.push(confirmUrl);
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setError("Payment was cancelled. Your order is saved as unpaid — you can try again.");
          },
        },
      });
      rzp.on("payment.failed", () => {
        setBusy(false);
        setError("The payment did not go through. No money was taken for this attempt — please try again.");
      });
      rzp.open();
    } catch {
      setError("We couldn't reach the server. Nothing was charged.");
      setBusy(false);
    }
  }

  const orderingOff = status !== null && !status.ordering;

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {orderingOff && (
          <p role="status" className="flex gap-3 rounded-xl border border-gold/50 bg-beige p-4 text-sm text-ink">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" aria-hidden />
            <span>
              <strong>Online ordering is being set up.</strong> You can review your order here, but orders can&apos;t be
              placed online yet. To order now, call{" "}
              <a className="font-semibold underline" href={`tel:${site.phone.tel}`}>
                {site.phone.display}
              </a>{" "}
              or <Link className="font-semibold underline" href="/contact?subject=order-support#enquiry">send an enquiry</Link>.
            </span>
          </p>
        )}

        <fieldset className="rounded-xl border border-beige-300/80 bg-white p-6">
          <legend className="px-1 font-serif text-xl font-bold text-forest-800">Customer details</legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="c-name" className="text-sm font-medium">Full name *</label>
              <input id="c-name" name="customer.name" autoComplete="name" {...field("customer.name")} />
              {err("customer.name")}
            </div>
            <div>
              <label htmlFor="c-email" className="text-sm font-medium">Email *</label>
              <input id="c-email" name="customer.email" type="email" autoComplete="email" {...field("customer.email")} />
              {err("customer.email")}
            </div>
            <div>
              <label htmlFor="c-phone" className="text-sm font-medium">Mobile number *</label>
              <input id="c-phone" name="customer.phone" type="tel" autoComplete="tel" {...field("customer.phone")} />
              {err("customer.phone")}
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-beige-300/80 bg-white p-6">
          <legend className="px-1 font-serif text-xl font-bold text-forest-800">Shipping address</legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="a-line1" className="text-sm font-medium">Address line 1 *</label>
              <input id="a-line1" name="address.line1" autoComplete="address-line1" {...field("address.line1")} />
              {err("address.line1")}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="a-line2" className="text-sm font-medium">Address line 2</label>
              <input id="a-line2" name="address.line2" autoComplete="address-line2" {...field("address.line2")} />
            </div>
            <div>
              <label htmlFor="a-city" className="text-sm font-medium">City / Town *</label>
              <input id="a-city" name="address.city" autoComplete="address-level2" {...field("address.city")} />
              {err("address.city")}
            </div>
            <div>
              <label htmlFor="a-pin" className="text-sm font-medium">PIN code *</label>
              <input id="a-pin" name="address.pincode" inputMode="numeric" autoComplete="postal-code" maxLength={6} {...field("address.pincode")} />
              {err("address.pincode")}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="a-state" className="text-sm font-medium">State *</label>
              <select
                id="a-state"
                name="address.state"
                autoComplete="address-level1"
                value={state}
                onChange={(e) => setState(e.target.value)}
                {...field("address.state")}
              >
                {indianStates.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              {err("address.state")}
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-beige-300/80 bg-white p-6">
          <legend className="px-1 font-serif text-xl font-bold text-forest-800">Payment method</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {[
              {
                v: "online" as const,
                icon: CreditCard,
                t: "Pay online",
                d: status?.onlinePayments ? "UPI, cards, net banking via Razorpay" : "Not yet available",
                disabled: status !== null && !status.onlinePayments,
              },
              { v: "cod" as const, icon: Banknote, t: "Cash on Delivery", d: "Pay when your order arrives", disabled: false },
            ].map(({ v, icon: Icon, t, d, disabled }) => (
              <label
                key={v}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold",
                  method === v ? "border-forest-800 bg-leaf-100/50" : "border-beige-300",
                  disabled && "cursor-not-allowed opacity-55",
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={v}
                  checked={method === v}
                  disabled={disabled}
                  onChange={() => setMethod(v)}
                  className="mt-1 accent-forest-800"
                />
                <Icon className="mt-0.5 h-5 w-5 text-forest-800" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold">{t}</span>
                  <span className="text-xs text-ink-soft">{d}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <OrderSummary subtotal={subtotal} state={state}>
        <ul className="mt-5 space-y-2 border-t border-beige-300 pt-4 text-sm">
          {lines.map((l) => (
            <li key={l.variantId} className="flex justify-between gap-3">
              <span className="text-ink-soft">
                {l.product.shortName} ({l.variant.label}) × {l.quantity}
              </span>
              <span>{formatINR(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="mt-4 flex gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || orderingOff || status === null}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-forest-800 px-6 font-semibold text-white hover:bg-forest-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
          {status === null ? "Checking availability…" : orderingOff ? "Online ordering coming soon" : method === "online" ? "Continue to Payment" : "Place Order"}
        </button>
        <p className="mt-3 text-center text-xs text-ink-soft">
          Totals are re-calculated securely on our server before payment.
        </p>
      </OrderSummary>
    </form>
  );
}
