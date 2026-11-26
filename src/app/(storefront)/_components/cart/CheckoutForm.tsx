"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Banknote, CreditCard, Info, Loader2, Lock, LogIn } from "lucide-react";
import { useCartLines } from "./useCartLines";
import { OrderSummary } from "./CartView";
import { checkoutSchema, fieldErrors, indianStates } from "@storefront/_lib/validation";
import { formatINR } from "@storefront/_lib/pricing";
import { site } from "@storefront/_lib/site";
import { ButtonLink, cn } from "@storefront/_components/ui/primitives";
import { useSignInDialog } from "@storefront/_components/account/SignInDialogProvider";
import { useCustomer } from "@storefront/_lib/customer-auth";

type Status = { ordering: boolean; onlinePayments: boolean } | null;

/** The part of the Cashfree JS SDK this form uses. */
type CashfreeInstance = {
  checkout: (opts: { paymentSessionId: string; redirectTarget?: "_self" | "_blank" | "_top" }) => Promise<unknown>;
};

declare global {
  interface Window {
    Cashfree?: (opts: { mode: "sandbox" | "production" }) => CashfreeInstance;
    loadCashfree?: (opts: { mode: "sandbox" | "production" }) => Promise<CashfreeInstance>;
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

function loadCashfree() {
  return new Promise<boolean>((resolve) => {
    if (window.Cashfree || window.loadCashfree) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
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

type CheckoutResponse = {
  orderNumber: string;
  token: string;
  gateway?: "cashfree" | "razorpay";
  cashfree?: { paymentSessionId: string; orderId: string; mode: "sandbox" | "production" };
  razorpay?: { keyId: string; orderId: string; amount: number; currency: string };
};

const inputCls =
  "mt-1.5 block w-full rounded-md border bg-white px-3.5 py-2.5 text-[15px] focus:border-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-800/20";

export function CheckoutForm() {
  const router = useRouter();
  const { lines, subtotal } = useCartLines();
  // Signed in: details are prefilled, the mobile is the verified one, and the order is linked to the account.
  const { user, profile } = useCustomer();
  const { open: openSignIn } = useSignInDialog();
  const verifiedPhone = user?.phoneNumber ?? null;
  const [state, setState] = useState<string>(site.shipping.homeState);
  const [method, setMethod] = useState<"online" | "cod">("online");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; description: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [testModal, setTestModal] = useState<{ orderId: string; token: string; orderNumber: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // The unpaid online order from the last attempt. Retrying with the same details reopens its
  // payment instead of creating another order.
  const pendingRef = useRef<{ request: string; data: CheckoutResponse } | null>(null);

  useEffect(() => {
    fetch("/api/checkout/status")
      .then((r) => r.json())
      .then((s: { ordering: boolean; onlinePayments: boolean }) => {
        setStatus(s);
        if (!s.onlinePayments) setMethod("cod");
      })
      .catch(() => setStatus({ ordering: false, onlinePayments: false }));
  }, []);

  useEffect(() => {
    if (!appliedCoupon) return;
    let active = true;
    fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: appliedCoupon.code, subtotal }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.ok && data.coupon) {
          setAppliedCoupon(data.coupon);
          setCouponError(null);
        } else {
          setAppliedCoupon(null);
          setCouponError(data.error || "Coupon is no longer valid for this cart.");
        }
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [subtotal]);

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError("Please enter a coupon code.");
      return;
    }
    setCouponBusy(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.coupon) {
        setAppliedCoupon(data.coupon);
        setCouponInput(data.coupon.code);
        setCouponError(null);
      } else {
        setAppliedCoupon(null);
        setCouponError(data.error || "Invalid coupon code.");
      }
    } catch {
      setCouponError("Could not validate coupon. Please try again.");
    } finally {
      setCouponBusy(false);
    }
  }

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
    // Marked with a visual "*" on the label; screen readers need it too (the form uses its own validation).
    "aria-required": name !== "address.line2",
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
      couponCode: appliedCoupon?.code || undefined,
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
      const request = JSON.stringify(parsed.data);
      let data: CheckoutResponse;
      if (pendingRef.current?.request === request) {
        data = pendingRef.current.data;
      } else {
        pendingRef.current = null;
        // The server checks this token and links the order to the account (an expired or forged one makes
        // it a guest order, so a failure here never blocks checkout).
        const idToken = user ? await user.getIdToken().catch(() => null) : null;
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
          body: request,
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.ok) {
          if (body.fields) setErrors(body.fields);
          setError(body.error ?? "Something went wrong. Nothing was charged.");
          setBusy(false);
          return;
        }
        data = body;
        if (data.cashfree || data.razorpay) pendingRef.current = { request, data };
      }
      const confirmUrl = `/checkout/confirmation?order=${encodeURIComponent(data.orderNumber)}&token=${encodeURIComponent(data.token)}`;

      // 1. Cashfree Checkout
      if (data.cashfree) {
        if (data.cashfree.paymentSessionId.startsWith("test_session_")) {
          setTestModal({
            orderId: data.cashfree.orderId,
            token: data.token,
            orderNumber: data.orderNumber,
          });
          setBusy(false);
          return;
        }

        const loaded = await loadCashfree();
        if (!loaded || (!window.Cashfree && !window.loadCashfree)) {
          setError("The Cashfree payment gateway could not be loaded. Please check your connection and try again.");
          setBusy(false);
          return;
        }

        try {
          let cfInstance: CashfreeInstance | undefined;
          if (typeof window.loadCashfree === "function") {
            cfInstance = await window.loadCashfree({ mode: data.cashfree.mode });
          } else if (window.Cashfree) {
            cfInstance = window.Cashfree({ mode: data.cashfree.mode });
          }

          if (cfInstance?.checkout) {
            await cfInstance.checkout({
              paymentSessionId: data.cashfree.paymentSessionId,
              redirectTarget: "_self",
            });
            return;
          }
        } catch (cfErr) {
          console.error("Cashfree checkout execution error:", cfErr);
          setError("Could not launch Cashfree payment. Please try again or choose Cash on Delivery.");
          setBusy(false);
          return;
        }
      }

      // 2. Razorpay Checkout (Fallback)
      if (data.razorpay) {
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
        return;
      }

      // 3. Cash on Delivery (no online gateway needed)
      router.push(confirmUrl);
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

        {/* Remounts once the account loads, so the prefilled values appear in these uncontrolled fields. */}
        <fieldset key={profile?.id ?? "guest"} className="rounded-xl border border-beige-300/80 bg-white p-6">
          <legend className="float-left mb-2 w-full font-serif text-xl font-bold text-forest-800 [&+*]:clear-both">Customer details</legend>
          {!user && (
            <p className="mt-1 text-sm text-ink-soft">
              Have an account?{" "}
              <button type="button" onClick={() => openSignIn("login")} className="inline-flex items-center gap-1 font-semibold text-forest-800 underline underline-offset-2">
                <LogIn className="h-3.5 w-3.5" aria-hidden /> Log in for faster checkout
              </button>
            </p>
          )}
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="c-name" className="text-sm font-medium">Full name *</label>
              <input id="c-name" name="customer.name" autoComplete="name" defaultValue={profile?.name ?? ""} {...field("customer.name")} />
              {err("customer.name")}
            </div>
            <div>
              <label htmlFor="c-email" className="text-sm font-medium">Email *</label>
              <input id="c-email" name="customer.email" type="email" autoComplete="email" defaultValue={profile?.email ?? ""} {...field("customer.email")} />
              {err("customer.email")}
            </div>
            <div>
              <label htmlFor="c-phone" className="text-sm font-medium">Mobile number *</label>
              {verifiedPhone ? (
                <>
                  <input
                    id="c-phone"
                    name="customer.phone"
                    type="tel"
                    readOnly
                    value={verifiedPhone}
                    {...field("customer.phone")}
                    className={cn(inputCls, "border-beige-300 bg-beige/40 text-ink-soft")}
                    aria-describedby="c-phone-note"
                  />
                  <p id="c-phone-note" className="mt-1 text-xs text-ink-soft">Your verified mobile number.</p>
                </>
              ) : (
                <input id="c-phone" name="customer.phone" type="tel" autoComplete="tel" {...field("customer.phone")} />
              )}
              {err("customer.phone")}
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-beige-300/80 bg-white p-6">
          <legend className="float-left mb-2 w-full font-serif text-xl font-bold text-forest-800 [&+*]:clear-both">Shipping address</legend>
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
          <legend className="float-left mb-2 w-full font-serif text-xl font-bold text-forest-800 [&+*]:clear-both">Payment method</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {[
              {
                v: "online" as const,
                icon: CreditCard,
                t: "Pay online (Cashfree)",
                d: status?.onlinePayments ? "UPI (GPay, PhonePe, Paytm), Cards, Net Banking" : "Available via Cash on Delivery",
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

      <OrderSummary subtotal={subtotal} state={state} discount={appliedCoupon?.discount ?? 0} couponCode={appliedCoupon?.code}>
        <div className="mt-4 border-t border-beige-300 pt-4">
          <label htmlFor="coupon-code-input" className="block text-xs font-semibold uppercase tracking-wider text-forest-800">
            Have a coupon code?
          </label>
          {appliedCoupon ? (
            <div className="mt-2 flex items-center justify-between rounded-md border border-leaf-600/40 bg-leaf-100/70 px-3 py-2 text-xs text-forest-900">
              <div>
                <span className="font-bold">{appliedCoupon.code}</span> applied (−{formatINR(appliedCoupon.discount)})
                {appliedCoupon.description && <p className="text-[11px] text-ink-soft">{appliedCoupon.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAppliedCoupon(null);
                  setCouponInput("");
                  setCouponError(null);
                }}
                className="font-semibold text-red-700 hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <input
                id="coupon-code-input"
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void applyCoupon();
                  }
                }}
                placeholder="Enter code (e.g. FESTIVE5)"
                className="min-w-0 flex-1 rounded-md border border-beige-300 bg-white px-3 py-2 text-sm uppercase focus:border-forest-800 focus:outline-none"
              />
              <button
                type="button"
                disabled={couponBusy}
                onClick={() => void applyCoupon()}
                className="rounded-md bg-forest-800 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-950 disabled:opacity-50"
              >
                {couponBusy ? "…" : "Apply"}
              </button>
            </div>
          )}
          {couponError && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">
              {couponError}
            </p>
          )}
        </div>
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

      {testModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-beige-300 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-forest-100 text-forest-800">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-forest-900">Cashfree Sandbox Test Mode</h3>
                <p className="text-xs text-ink-soft">Test order: <strong className="text-forest-800">{testModal.orderNumber}</strong></p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 text-xs leading-relaxed text-amber-950">
              <span className="font-bold uppercase tracking-wider text-amber-800">Test Simulation (No Real Money Debited)</span>
              <p className="mt-1">
                Your payment gateway is in <strong>TEST</strong> mode. You can test placing this order now to verify Firestore sync, stock deduction, and confirmation page.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/api/payments/cashfree/verify?order_id=${encodeURIComponent(testModal.orderId)}&token=${encodeURIComponent(testModal.token)}&test_status=PAID`;
                }}
                className="w-full rounded-lg bg-forest-800 py-3 text-sm font-semibold text-white shadow-sm hover:bg-forest-900 transition-colors"
              >
                Simulate Successful Test Payment
              </button>
              <button
                type="button"
                onClick={() => {
                  setTestModal(null);
                  setError("Test payment cancelled.");
                }}
                className="w-full rounded-lg border border-beige-300 py-2.5 text-sm font-medium text-ink-soft hover:bg-beige-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
