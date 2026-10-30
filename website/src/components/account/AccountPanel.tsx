"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import { Heart, Info, Loader2, LogOut, Mail, PackageSearch, ShoppingCart } from "lucide-react";
import { site } from "@/lib/site";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function QuickLinks() {
  const items = [
    { href: "/wishlist", icon: Heart, label: "Wishlist" },
    { href: "/cart", icon: ShoppingCart, label: "Cart" },
    { href: "/track-order", icon: PackageSearch, label: "Track an order" },
  ];
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {items.map(({ href, icon: Icon, label }) => (
        <li key={href}>
          <Link href={href} className="flex min-h-14 items-center gap-3 rounded-xl border border-beige-300/80 bg-white px-4 font-medium text-forest-900 hover:border-forest-800">
            <Icon className="h-5 w-5 text-forest-800" aria-hidden /> {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Passwordless (magic link) sign-in via Supabase Auth. When Supabase public
 * keys are not configured, shows an honest "coming soon" state.
 */
export function AccountPanel() {
  const supabase = useMemo(() => (url && anonKey ? createClient(url, anonKey) : null), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  if (!supabase) {
    return (
      <div className="space-y-6">
        <p className="flex gap-3 rounded-xl border border-gold/50 bg-beige p-4 text-sm">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" aria-hidden />
          Customer accounts are being set up. You can still shop as a guest, save favourites to your wishlist on this
          device, and track orders with your order number.
        </p>
        <QuickLinks />
      </div>
    );
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading…
      </p>
    );
  }

  if (session) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-beige-300/80 bg-white p-5">
          <p>
            Signed in as <strong>{session.user.email}</strong>
          </p>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-forest-800 px-4 text-sm font-semibold text-forest-800 hover:bg-forest-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </button>
        </div>
        <QuickLinks />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form
        className="max-w-md space-y-4 rounded-xl border border-beige-300/80 bg-white p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
          if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg({ kind: "err", text: "Please enter a valid email address." });
          setSending(true);
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${window.location.origin}/account` },
          });
          setSending(false);
          setMsg(
            error
              ? { kind: "err", text: "We couldn't send the sign-in link. Please try again." }
              : { kind: "ok", text: `We've emailed a sign-in link to ${email}.` },
          );
        }}
      >
        <h2 className="font-serif text-2xl font-bold text-forest-800">Sign in</h2>
        <p className="text-sm text-ink-soft">We&apos;ll email you a secure sign-in link — no password needed.</p>
        <div>
          <label htmlFor="acc-email" className="text-sm font-medium">Email</label>
          <input
            id="acc-email"
            name="email"
            type="email"
            autoComplete="email"
            className="mt-1.5 block w-full rounded-md border border-beige-300 px-3.5 py-2.5 focus:border-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-800/20"
          />
        </div>
        <p aria-live="polite" className={msg?.kind === "err" ? "text-sm text-red-700" : "text-sm text-forest-800"}>
          {msg?.text}
        </p>
        <button
          type="submit"
          disabled={sending}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-forest-800 px-6 text-sm font-semibold text-white hover:bg-forest-950 disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />}
          Email me a sign-in link
        </button>
      </form>
      <QuickLinks />
      <p className="text-xs text-ink-soft">Need help? Call {site.phone.display}.</p>
    </div>
  );
}
