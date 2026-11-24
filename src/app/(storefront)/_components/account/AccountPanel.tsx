"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, Loader2, LogIn, LogOut, PackageSearch, Pencil, ShoppingCart, UserPlus } from "lucide-react";
import { site } from "@storefront/_lib/site";
import { signOutCustomer, updateProfile, useCustomer, type CustomerProfile } from "@storefront/_lib/customer-auth";
import { OrderHistory } from "./OrderHistory";
import { useSignInDialog } from "./SignInDialogProvider";

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

const formatPhone = (e164: string) => (e164.startsWith("+91") ? `+91 ${e164.slice(3, 8)} ${e164.slice(8)}` : e164);
const inputCls =
  "mt-1.5 block w-full rounded-md border border-beige-300 bg-white px-3.5 py-2.5 focus:border-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-800/20";

function ProfileCard({ profile }: { profile: CustomerProfile }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  return (
    <section aria-labelledby="profile-title" className="rounded-xl border border-beige-300/80 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="profile-title" className="font-serif text-2xl font-bold text-forest-800">
          My Profile
        </h2>
        <div className="flex gap-2">
          {!editing && (
            <button
              type="button"
              onClick={() => {
                setMsg(null);
                setEditing(true);
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-beige-300 px-4 text-sm font-semibold text-forest-800 hover:border-forest-800"
            >
              <Pencil className="h-4 w-4" aria-hidden /> Edit
            </button>
          )}
          <button
            type="button"
            onClick={() => void signOutCustomer()}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-forest-800 px-4 text-sm font-semibold text-forest-800 hover:bg-forest-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </button>
        </div>
      </div>

      {editing ? (
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const name = String(f.get("name") ?? "").trim();
            const email = String(f.get("email") ?? "").trim();
            if (!name) return setMsg({ kind: "err", text: "Please enter your name." });
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setMsg({ kind: "err", text: "Enter a valid email address, or leave it blank." });
            setSaving(true);
            try {
              await updateProfile(profile.id, { name, email });
              setEditing(false);
              setMsg({ kind: "ok", text: "Your details are saved." });
            } catch {
              setMsg({ kind: "err", text: "We couldn't save your details. Please try again." });
            } finally {
              setSaving(false);
            }
          }}
        >
          <label className="text-sm font-medium">
            Full name
            <input name="name" defaultValue={profile.name} autoComplete="name" required className={inputCls} />
          </label>
          <label className="text-sm font-medium">
            Email <span className="font-normal text-ink-soft">(optional)</span>
            <input name="email" type="email" defaultValue={profile.email ?? ""} autoComplete="email" className={inputCls} />
          </label>
          <div className="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-forest-800 px-6 text-sm font-semibold text-white hover:bg-forest-950 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="min-h-11 px-4 text-sm font-semibold text-forest-800">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-soft">Name</dt>
            <dd className="mt-1 font-medium">{profile.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-soft">Mobile</dt>
            <dd className="mt-1 font-medium">{formatPhone(profile.phone)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-soft">Email</dt>
            <dd className="mt-1 break-all font-medium">{profile.email || <span className="text-ink-soft">Not added</span>}</dd>
          </div>
        </dl>
      )}
      <p aria-live="polite" className={`mt-3 text-sm ${msg?.kind === "err" ? "text-red-700" : "text-forest-800"}`}>
        {msg?.text}
      </p>
      {editing && <p className="text-xs text-ink-soft">Your mobile number is how you log in, so it can&apos;t be changed here.</p>}
    </section>
  );
}

/** My Account: log in / create account when signed out; profile, orders and quick links when signed in. */
export function AccountPanel() {
  const { user, profile, loading } = useCustomer();
  const { open } = useSignInDialog();

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading…
      </p>
    );
  }

  if (user && profile) {
    return (
      <div className="space-y-8">
        <ProfileCard profile={profile} />
        <OrderHistory uid={user.uid} />
        <QuickLinks />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-xl rounded-xl border border-beige-300/80 bg-white p-6">
        <h2 className="font-serif text-2xl font-bold text-forest-800">Log in to your account</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Log in with your mobile number — we&apos;ll text you a one-time code, no password needed. Your account keeps
          your orders, cart and wishlist on every device you use.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => open("login")}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-forest-800 px-6 text-sm font-semibold text-white hover:bg-forest-950"
          >
            <LogIn className="h-4 w-4" aria-hidden /> Log in
          </button>
          <button
            type="button"
            onClick={() => open("create")}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-forest-800 px-6 text-sm font-semibold text-forest-800 hover:bg-forest-800 hover:text-white"
          >
            <UserPlus className="h-4 w-4" aria-hidden /> Create account
          </button>
        </div>
      </div>
      <QuickLinks />
      <p className="text-xs text-ink-soft">Need help? Call {site.phone.display}.</p>
    </div>
  );
}
