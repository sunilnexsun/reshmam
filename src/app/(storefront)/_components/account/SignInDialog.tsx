"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useReducer, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Heart, Loader2, Lock, Mail, Package, Phone, ShoppingCart, User, X } from "lucide-react";
import { authErrorMessage, createAccount, logIn, sendPasswordReset } from "@storefront/_lib/customer-auth";
import { MIN_PASSWORD_LENGTH } from "@storefront/_lib/account-identity";
import { initialSignInState, signInReducer, type Mode, type Request, type SignInEvent } from "./sign-in-machine";

const FEATURES = [
  { icon: ShoppingCart, title: "Place Orders", text: "for your favourite oils" },
  { icon: Package, title: "Track Deliveries", text: "in real time" },
  { icon: Heart, title: "Save Favourites", text: "and reorder easily" },
  { icon: User, title: "Manage Your Profile", text: "and addresses" },
];

const errorCode = (e: unknown) => (e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "");

/** The brighter gold of the brand panel in the design (decorative text on dark green: 7:1 contrast). */
const PANEL_GOLD = "text-[#e9bb45]";

/** Two-leaf sprout above each heading. */
function Sprout({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="sprout-leaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6fb43f" />
          <stop offset="1" stopColor="#2f7d32" />
        </linearGradient>
      </defs>
      <path d="M23 30C21 18 12 9 1 9c1 12 10 20 22 21Z" fill="url(#sprout-leaf)" />
      <path d="M25 30c2-12 11-21 22-21-1 12-10 20-22 21Z" fill="url(#sprout-leaf)" />
      <path d="M24 31V22" stroke="#2f7d32" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Soft leaves tucked into the panel's top-left corner. */
function CornerLeaves() {
  return (
    <svg viewBox="0 0 120 90" className="pointer-events-none absolute -left-3 -top-3 h-24 w-32" aria-hidden>
      <path d="M0 8c26-6 52 4 62 30C36 46 10 36 0 8Z" fill="#5a9e3a" opacity=".85" />
      <path d="M8 0c20 10 30 30 22 54C12 44 2 24 8 0Z" fill="#78b84a" opacity=".7" />
      <path d="M40 0c22 2 40 14 44 36-22 0-40-12-44-36Z" fill="#3f8a34" opacity=".6" />
    </svg>
  );
}

function BrandPanel() {
  return (
    <div className="relative overflow-hidden bg-[radial-gradient(130%_80%_at_20%_0%,var(--color-forest-700),var(--color-forest-950))] text-white">
      {/* Phones: a compact header. */}
      <div className="flex items-center gap-3 px-5 py-3 md:hidden">
        <Image src="/images/logo-light.webp" alt="Reshmam" width={96} height={51} className="h-10 w-auto" />
        <p className="font-bookman text-xl leading-tight">
          Create Your <span className={PANEL_GOLD}>Account</span>
        </p>
      </div>
      {/* Tablets and up: the full brand panel. */}
      <div className="relative hidden h-full min-h-[560px] flex-col items-center pb-44 pl-6 pr-[calc(18%+0.5rem)] pt-7 md:flex">
        <CornerLeaves />
        <Image src="/images/logo-light.webp" alt="Reshmam" width={150} height={80} className="relative h-[4.5rem] w-auto" priority />
        <p className={`mt-2 text-[0.68rem] font-bold uppercase tracking-[0.08em] ${PANEL_GOLD}`}>Pure. Traditional. Trusted.</p>
        <span className="mt-1.5 h-px w-8 bg-[#e9bb45]/70" aria-hidden />
        <p className="font-bookman mt-4 text-center text-[2.15rem] leading-[1.1]">
          Create Your
          <br />
          <span className={PANEL_GOLD}>Account</span>
        </p>
        <svg viewBox="0 0 160 10" className="mt-1 h-2.5 w-36 text-[#e9bb45]" aria-hidden>
          <path d="M2 7C50 1 110 1 158 5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <ul className="mt-6 w-full space-y-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/10">
                <Icon className={`h-5 w-5 ${PANEL_GOLD}`} aria-hidden />
              </span>
              <span className="text-[0.82rem] leading-snug">
                <span className="block font-bold">{title}</span>
                <span className="text-white/80">{text}</span>
              </span>
            </li>
          ))}
        </ul>
        {/* Oil pouring into a bowl, fading up into the green. */}
        <Image
          src="/images/banner-story-right.webp"
          alt=""
          width={618}
          height={360}
          sizes="320px"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44 w-full object-cover object-[35%_60%] [mask-image:linear-gradient(to_top,black_55%,transparent)]"
        />
      </div>
    </div>
  );
}

/**
 * The curved, gold-edged seam between the green panel and the form, traced from the design: the green reaches
 * 41.5% of the card at the top, swings in to 34% a third of the way down, out to 38% at three quarters, and back
 * to 33% at the bottom. The SVG spans 33%–41.5% of the card, so its x runs 0–100 across that band.
 */
const SEAM = "M100 0C55 8 12 22 14 40C16 52 58 64 58 76C56 86 22 95 4 100";
function Seam() {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-y-0 left-[33%] z-10 hidden h-full w-[calc(8.5%+2px)] md:block" aria-hidden>
      <path d={`${SEAM}H100Z`} fill="var(--color-cream)" />
      <path d={SEAM} fill="none" stroke="#d9a63c" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Green tick with a ring of gold rays, for the success screens. */
function SuccessBadge() {
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <span className="relative grid h-36 w-36 place-items-center">
      <svg viewBox="0 0 144 144" className="absolute inset-0" aria-hidden>
        {rays.map((deg) => (
          <line key={deg} x1="72" y1="6" x2="72" y2="17" stroke="#d4b62c" strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${deg} 72 72)`} />
        ))}
      </svg>
      <span className="grid h-[5.5rem] w-[5.5rem] place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#5cb84a,#2f8a35)] text-white shadow-md">
        <Check className="h-11 w-11" aria-hidden strokeWidth={3.25} />
      </span>
    </span>
  );
}

const primaryBtn =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-forest-800 px-5 text-[1.02rem] font-semibold text-white shadow-sm hover:bg-forest-900 disabled:opacity-60";
const fieldBox =
  "flex min-h-12 items-center gap-3 rounded-lg border border-beige-300 bg-white px-3.5 text-ink focus-within:border-forest-800 focus-within:ring-2 focus-within:ring-forest-800/20";
const fieldLabel = "mb-1.5 block text-sm font-bold text-ink";

export function SignInDialog({ initialMode, onClose }: { initialMode: Mode; onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, dispatch] = useReducer(signInReducer, initialMode, (m) => initialSignInState(m));
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Open as a modal (focus trap, Esc, inert page behind) and give focus back to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.showModal();
    // showModal() focuses the first button (×); start on the first field instead.
    dialog?.querySelector<HTMLElement>("form input")?.focus();
    return () => opener?.focus?.();
  }, []);

  // Each mode's form starts on its first field.
  useEffect(() => {
    if (state.outcome) return;
    dialogRef.current?.querySelector<HTMLElement>("form input")?.focus();
  }, [state.mode, state.outcome]);

  /** Runs the event through the reducer first, so validation lives in one place; only then calls Firebase. */
  const send = (event: SignInEvent) => {
    const next = signInReducer(stateRef.current, event);
    stateRef.current = next;
    dispatch(event);
    if (next.pending && next.request) void run(next.request);
  };

  async function run(request: Request) {
    try {
      if (request.kind === "create") await createAccount(request);
      else if (request.kind === "login") await logIn(request.email, request.password);
      else await sendPasswordReset(request.email);
      dispatch({ type: "SUCCEEDED" });
    } catch (e) {
      dispatch({ type: "ERROR", message: authErrorMessage(errorCode(e)) });
    }
  }

  const titleId = "sign-in-title";
  const errorId = "sign-in-error";
  const describedBy = state.error ? errorId : undefined;
  const error = state.error ? (
    <p id={errorId} role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {state.error}
    </p>
  ) : null;
  const submit = (label: string) => (
    <button type="submit" className={primaryBtn} disabled={state.pending}>
      {state.pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} {label}{" "}
      {!state.pending && <ArrowRight className="h-4 w-4" aria-hidden />}
    </button>
  );
  const emailField = (
    <Field label="Email" icon={Mail}>
      <input
        name="email"
        type="email"
        inputMode="email"
        defaultValue={state.email}
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="Your email address"
        className={inputCls}
        aria-invalid={Boolean(state.error) || undefined}
        aria-describedby={describedBy}
      />
    </Field>
  );
  const text = (f: FormData, k: string) => String(f.get(k) ?? "");

  let body: React.ReactNode;
  if (state.outcome === "resetSent") {
    body = (
      <div className="flex flex-col items-center text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-beige text-forest-800">
          <Mail className="h-9 w-9" aria-hidden />
        </span>
        <h2 id={titleId} className="font-bookman mt-4 text-[1.8rem] leading-tight text-forest-900">
          Check Your Email
        </h2>
        <p className="mt-3 text-ink">
          If there&apos;s an account for that email, we&apos;ve sent a link to choose a new password.
        </p>
        <div className="mt-8 w-full">
          <button type="button" className={primaryBtn} onClick={() => send({ type: "SWITCH_MODE", mode: "login" })} autoFocus>
            Back to Log In <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    );
  } else if (state.outcome) {
    const copy = {
      created: { title: "Account Created Successfully!", text: <>Welcome to <strong>Reshmam!</strong></> },
      loggedIn: { title: "Logged In Successfully!", text: <>Welcome back to <strong>Reshmam!</strong></> },
    }[state.outcome];
    body = (
      <div className="flex flex-col items-center text-center">
        <SuccessBadge />
        <h2 id={titleId} className="font-bookman mt-4 max-w-xs text-[1.9rem] leading-tight text-forest-900">
          {copy.title}
        </h2>
        <p className="mt-4 text-ink">{copy.text}</p>
        <div className="mt-10 grid w-full gap-3">
          <button type="button" className={primaryBtn} onClick={onClose} autoFocus>
            Continue Shopping <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-ink/25 bg-white text-[1.02rem] font-semibold text-ink hover:border-forest-800"
            onClick={() => {
              onClose();
              router.push("/account");
            }}
          >
            <User className="h-4 w-4" aria-hidden /> Go to My Account
          </button>
        </div>
      </div>
    );
  } else if (state.mode === "create") {
    body = (
      <form
        key="create"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          send({ type: "CREATE_SUBMITTED", name: text(f, "name"), email: text(f, "email"), phone: text(f, "phone"), password: text(f, "password"), confirm: text(f, "confirm") });
        }}
        className="space-y-4"
      >
        <Heading id={titleId} title="Create Your Account" text="Get started in just a few steps." />
        <Field label="Full Name" icon={User}>
          <input name="name" autoComplete="name" placeholder="Your full name" className={inputCls} aria-describedby={describedBy} />
        </Field>
        {emailField}
        <Field label="Mobile Number" icon={Phone}>
          <span className="font-bold">+91</span>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="10-digit mobile number"
            className={inputCls}
            aria-describedby={describedBy}
          />
        </Field>
        <PasswordField label="Password" name="password" autoComplete="new-password" placeholder={`Min. ${MIN_PASSWORD_LENGTH} characters`} describedBy={describedBy} />
        <PasswordField label="Confirm Password" name="confirm" autoComplete="new-password" placeholder="Re-enter password" describedBy={describedBy} />
        {error}
        {submit("Create Account")}
        <SwitchMode text="Already have an account?" action="Log In" onClick={() => send({ type: "SWITCH_MODE", mode: "login" })} />
      </form>
    );
  } else if (state.mode === "login") {
    body = (
      <form
        key="login"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          send({ type: "LOGIN_SUBMITTED", email: text(f, "email"), password: text(f, "password") });
        }}
        className="space-y-4"
      >
        <Heading id={titleId} title="Log In to Your Account" text="Welcome back! Log in with your email and password." />
        {emailField}
        <PasswordField label="Password" name="password" autoComplete="current-password" placeholder="Your password" describedBy={describedBy} />
        <p className="-mt-2 text-right">
          <button type="button" className="text-sm font-semibold text-forest-800 underline underline-offset-2" onClick={() => send({ type: "SWITCH_MODE", mode: "forgot" })}>
            Forgot password?
          </button>
        </p>
        {error}
        {submit("Log In")}
        <SwitchMode text="New to Reshmam?" action="Create an account" onClick={() => send({ type: "SWITCH_MODE", mode: "create" })} />
      </form>
    );
  } else {
    body = (
      <form
        key="forgot"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          send({ type: "RESET_SUBMITTED", email: text(new FormData(e.currentTarget), "email") });
        }}
        className="space-y-4"
      >
        <Heading id={titleId} title="Reset Your Password" text="Enter the email on your account and we'll send you a link to choose a new password." />
        {emailField}
        {error}
        {submit("Send Reset Link")}
        <button type="button" className="mx-auto flex items-center gap-2 text-sm font-semibold text-forest-800 hover:underline" onClick={() => send({ type: "SWITCH_MODE", mode: "login" })}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to Log In
        </button>
      </form>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-[820px] overflow-hidden rounded-2xl border border-beige-300 bg-cream p-0 text-ink shadow-2xl backdrop:bg-forest-950/60"
    >
      <div className="relative grid max-h-[calc(100dvh-2rem)] overflow-y-auto md:grid-cols-[41.5%_1fr]">
        <Seam />
        <BrandPanel />
        <div className="relative flex flex-col px-5 pb-8 pt-6 sm:px-9 md:pl-5">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-forest-900 hover:bg-beige">
            <X className="h-5 w-5" aria-hidden />
          </button>
          <div className="my-auto w-full py-2">{body}</div>
        </div>
      </div>
    </dialog>
  );
}

const inputCls = "w-full bg-transparent outline-none placeholder:text-ink-soft";

function Field({ label, icon: Icon, children }: { label: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={fieldLabel}>
        {label} <span className="text-red-600">*</span>
      </span>
      <span className={fieldBox}>
        <Icon className="h-[1.1rem] w-[1.1rem] shrink-0" aria-hidden />
        {children}
      </span>
    </label>
  );
}

function PasswordField({ label, name, autoComplete, placeholder, describedBy }: { label: string; name: string; autoComplete: string; placeholder: string; describedBy?: string }) {
  const [shown, setShown] = useState(false);
  const inputId = useId();
  return (
    <div>
      <label htmlFor={inputId} className={fieldLabel}>
        {label} <span className="text-red-600">*</span>
      </label>
      <span className={fieldBox}>
        <Lock className="h-[1.1rem] w-[1.1rem] shrink-0" aria-hidden />
        <input id={inputId} name={name} type={shown ? "text" : "password"} autoComplete={autoComplete} placeholder={placeholder} className={inputCls} aria-describedby={describedBy} />
        <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={shown} className="-mr-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-md text-ink-soft hover:text-forest-800">
          {shown ? <EyeOff className="h-[1.1rem] w-[1.1rem]" aria-hidden /> : <Eye className="h-[1.1rem] w-[1.1rem]" aria-hidden />}
        </button>
      </span>
    </div>
  );
}

function Heading({ id, title, text }: { id: string; title: string; text: string }) {
  return (
    <div className="mb-2 text-center">
      <Sprout className="mx-auto h-8 w-12" />
      <h2 id={id} className="font-bookman mt-2 text-[1.65rem] leading-tight text-forest-900 sm:text-[1.8rem]">
        {title}
      </h2>
      <p className="mt-2 text-[0.95rem] text-ink">{text}</p>
    </div>
  );
}

function SwitchMode({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return (
    <p className="text-center text-sm text-ink-soft">
      {text}{" "}
      <button type="button" onClick={onClick} className="font-semibold text-forest-800 underline underline-offset-2">
        {action}
      </button>
    </p>
  );
}
