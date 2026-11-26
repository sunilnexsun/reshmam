"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { ArrowLeft, ArrowRight, Check, Heart, Info, Loader2, Mail, Package, Phone, ShoppingCart, User, X } from "lucide-react";
import { customerAuth } from "@storefront/_lib/customer-firebase";
import { authErrorMessage, createProfile, getProfile, signOutCustomer } from "@storefront/_lib/customer-auth";
import { toE164 } from "@storefront/_lib/phone";
import { OtpInput } from "./OtpInput";
import { initialSignInState, signInReducer, type Mode, type SignInEvent, type SignInState } from "./sign-in-machine";

export const RESEND_SECONDS = 30;

const FEATURES = [
  { icon: ShoppingCart, title: "Place Orders", text: "for your favourite oils" },
  { icon: Package, title: "Track Deliveries", text: "in real time" },
  { icon: Heart, title: "Save Favourites", text: "and reorder easily" },
  { icon: User, title: "Manage Your Profile", text: "and addresses" },
];

const formatPhone = (tenDigits: string) => `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`;
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
      <div className="relative hidden h-full min-h-[560px] flex-col items-center px-6 pb-44 pt-7 md:flex">
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

/** The curved gold-edged seam between the green panel and the form, as in the design. */
function Seam() {
  return (
    <svg viewBox="0 0 40 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-y-0 -left-10 hidden h-full w-11 md:block" aria-hidden>
      <path d="M40 0H30C14 22 34 46 20 68 12 82 18 94 24 100h16Z" fill="var(--color-cream)" />
      <path d="M30 0C14 22 34 46 20 68 12 82 18 94 24 100" fill="none" stroke="#d9a63c" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Progress({ step }: { step: SignInState["step"] }) {
  const steps = [
    { key: "details", label: "Your Details" },
    { key: "mobile", label: "Mobile" },
    { key: "otp", label: "Verify OTP" },
  ] as const;
  const current = steps.findIndex((s) => s.key === step);
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-ink" aria-label="Steps">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={s.key}
            className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 ${active ? "bg-beige" : ""}`}
            aria-current={active ? "step" : undefined}
          >
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-[0.7rem] font-bold ${
                done ? "bg-[#3f9a3c] text-white" : active ? "bg-forest-800 text-white" : "bg-beige text-forest-900"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : i + 1}
            </span>
            <span className={active ? "font-semibold text-forest-900" : ""}>{s.label}</span>
          </li>
        );
      })}
    </ol>
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
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const [state, dispatch] = useReducer(signInReducer, initialMode, initialSignInState);
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Open as a modal (focus trap, Esc, inert page behind) and give focus back to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.showModal();
    // showModal() focuses the first button (×); start on the first field instead.
    dialog?.querySelector<HTMLElement>("form input")?.focus();
    return () => {
      verifierRef.current?.clear();
      verifierRef.current = null;
      opener?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (state.step !== "otp" || resendAt <= now) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [state.step, resendAt, now]);

  const close = () => {
    // Verified but never finished their details: no account was made, so don't leave them half signed in.
    if (stateRef.current.verified && stateRef.current.step !== "done") void signOutCustomer();
    onClose();
  };

  /** Runs the event through the reducer first, so validation lives in one place; only then calls Firebase. */
  const send = (event: SignInEvent) => {
    const next = signInReducer(stateRef.current, event);
    stateRef.current = next;
    dispatch(event);
    if (!next.pending) return;
    if (event.type === "MOBILE_SUBMITTED") void sendOtp(next.phone);
    else if (event.type === "OTP_SUBMITTED") void verify(next);
    else if (event.type === "DETAILS_SUBMITTED") void saveProfile(next);
  };

  const fail = (e: unknown) => dispatch({ type: "ERROR", message: authErrorMessage(errorCode(e)) });

  async function sendOtp(phone: string) {
    try {
      // A reCAPTCHA token works for one SMS only, so every send (including Resend and a changed number) gets a
      // fresh verifier on a fresh element; reusing a solved one leaves the request hanging.
      verifierRef.current?.clear();
      const host = document.createElement("div");
      recaptchaRef.current!.replaceChildren(host);
      verifierRef.current = new RecaptchaVerifier(customerAuth, host, { size: "invisible" });
      confirmationRef.current = await signInWithPhoneNumber(customerAuth, toE164(phone), verifierRef.current);
      setResendAt(Date.now() + RESEND_SECONDS * 1000);
      setNow(Date.now());
      dispatch({ type: "OTP_SENT" });
    } catch (e) {
      // A used or failed reCAPTCHA can't be reused; start a fresh one next time.
      verifierRef.current?.clear();
      verifierRef.current = null;
      fail(e);
    }
  }

  async function verify(s: SignInState) {
    try {
      const { user } = await confirmationRef.current!.confirm(s.code);
      const profile = await getProfile(user.uid);
      if (!profile && s.mode === "create") await createProfile(user, { name: s.name, email: s.email });
      dispatch({ type: "OTP_CONFIRMED", hasProfile: Boolean(profile) });
    } catch (e) {
      fail(e);
    }
  }

  async function saveProfile(s: SignInState) {
    const user = customerAuth.currentUser;
    if (!user) return dispatch({ type: "RESET", mode: "login" });
    try {
      await createProfile(user, { name: s.name, email: s.email });
      dispatch({ type: "OTP_CONFIRMED", hasProfile: false });
    } catch (e) {
      fail(e);
    }
  }

  const showProgress = state.mode === "create" && state.step !== "done" && !state.verified;
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const titleId = "sign-in-title";
  const errorId = "sign-in-error";
  const error = state.error ? (
    <p id={errorId} role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {state.error}
    </p>
  ) : null;

  let body: React.ReactNode;
  if (state.step === "done") {
    const copy = {
      created: { title: "Account Created Successfully!", text: <>Welcome to <strong>Reshmam!</strong></> },
      loggedIn: { title: "Logged In Successfully!", text: <>Welcome back to <strong>Reshmam!</strong></> },
      welcomeBack: { title: "Welcome Back!", text: <>You already have an account with this number, so we&apos;ve logged you in.</> },
    }[state.outcome ?? "loggedIn"];
    body = (
      <div className="flex flex-col items-center text-center">
        <SuccessBadge />
        <h2 id={titleId} className="font-bookman mt-4 max-w-xs text-[1.9rem] leading-tight text-forest-900">
          {copy.title}
        </h2>
        <p className="mt-4 text-ink">{copy.text}</p>
        <div className="mt-10 grid w-full gap-3">
          <button type="button" className={primaryBtn} onClick={close} autoFocus>
            Continue Shopping <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-ink/25 bg-white text-[1.02rem] font-semibold text-ink hover:border-forest-800"
            onClick={() => {
              close();
              router.push("/account");
            }}
          >
            <User className="h-4 w-4" aria-hidden /> Go to My Account
          </button>
        </div>
      </div>
    );
  } else if (state.step === "details") {
    body = (
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          send({ type: "DETAILS_SUBMITTED", name: String(f.get("name") ?? ""), email: String(f.get("email") ?? "") });
        }}
        className="space-y-4"
      >
        <Heading id={titleId} title="Create Your Account" text={state.verified ? `No account yet for ${formatPhone(state.phone)}. Add your name to finish.` : "Get started in just a few steps."} />
        <label className="block">
          <span className={fieldLabel}>
            Full Name <span className="text-red-600">*</span>
          </span>
          <span className={fieldBox}>
            <User className="h-[1.1rem] w-[1.1rem]" aria-hidden />
            <input name="name" required defaultValue={state.name} autoComplete="name" placeholder="Enter your full name" className="w-full bg-transparent outline-none placeholder:text-ink-soft" autoFocus aria-describedby={state.error ? errorId : undefined} />
          </span>
        </label>
        <label className="block">
          <span className={fieldLabel}>
            Email Address <span className="font-normal text-ink-soft">(Optional)</span>
          </span>
          <span className={fieldBox}>
            <Mail className="h-[1.1rem] w-[1.1rem]" aria-hidden />
            <input name="email" type="email" defaultValue={state.email} autoComplete="email" placeholder="Enter your email address" className="w-full bg-transparent outline-none placeholder:text-ink-soft" />
          </span>
        </label>
        {error}
        <button type="submit" className={primaryBtn} disabled={state.pending}>
          {state.pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {state.verified ? "Create Account" : "Continue"} {!state.pending && <ArrowRight className="h-4 w-4" aria-hidden />}
        </button>
        {!state.verified && <SwitchMode text="Already have an account?" action="Log In" onClick={() => send({ type: "SWITCH_MODE", mode: "login" })} />}
      </form>
    );
  } else if (state.step === "mobile") {
    const create = state.mode === "create";
    body = (
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          send({ type: "MOBILE_SUBMITTED", phone: String(new FormData(e.currentTarget).get("phone") ?? "") });
        }}
        className="space-y-4"
      >
        <Heading
          id={titleId}
          title={create ? "Enter Your Mobile Number" : "Log In to Your Account"}
          text={create ? "We'll use this number to verify your account." : "Welcome back! Please enter your registered mobile number."}
        />
        <label className="block">
          <span className={fieldLabel}>
            Mobile Number {create && <span className="text-red-600">*</span>}
          </span>
          <span className={fieldBox}>
            <Phone className="h-[1.1rem] w-[1.1rem]" aria-hidden />
            <span className="font-bold">+91</span>
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              defaultValue={state.phone}
              placeholder="Enter your 10-digit mobile number"
              className="w-full bg-transparent outline-none placeholder:text-ink-soft"
              autoFocus
              aria-invalid={Boolean(state.error) || undefined}
              aria-describedby={state.error ? errorId : undefined}
            />
          </span>
        </label>
        {error}
        <button type="submit" className={primaryBtn} disabled={state.pending}>
          {state.pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Send OTP {!state.pending && <ArrowRight className="h-4 w-4" aria-hidden />}
        </button>
        {create ? (
          <p className="flex items-center gap-3 rounded-lg border border-beige-300 bg-beige/50 px-3.5 py-3 text-xs leading-relaxed text-ink">
            <Info className="h-5 w-5 shrink-0 text-[#d9a63c]" aria-hidden /> We&apos;ll send a one-time password (OTP) to verify your mobile number.
          </p>
        ) : (
          <SwitchMode text="New to Reshmam?" action="Create an account" onClick={() => send({ type: "SWITCH_MODE", mode: "create" })} />
        )}
      </form>
    );
  } else {
    body = (
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          send({ type: "OTP_SUBMITTED" });
        }}
        className="space-y-5"
      >
        <Heading id={titleId} title="Verify Your Mobile Number" text="Enter the 6-digit OTP sent to" />
        <p className="-mt-3 text-center text-lg font-bold text-forest-900">{formatPhone(state.phone)}</p>
        <div className="flex justify-center">
          <OtpInput value={state.code} onChange={(code) => dispatch({ type: "CODE_CHANGED", code })} disabled={state.pending} autoFocus invalid={Boolean(state.error)} />
        </div>
        {error}
        <p className="text-center text-sm text-ink">
          {resendIn > 0 ? (
            <>
              Resend OTP in <span className="font-bold text-forest-900">00:{String(resendIn).padStart(2, "0")}</span>
            </>
          ) : (
            <button type="button" className="font-semibold text-forest-800 underline underline-offset-2" disabled={state.pending} onClick={() => send({ type: "MOBILE_SUBMITTED", phone: state.phone })}>
              Resend OTP
            </button>
          )}
        </p>
        <button type="submit" className={primaryBtn} disabled={state.pending}>
          {state.pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {state.mode === "create" ? "Verify & Continue" : "Log In"} {!state.pending && <ArrowRight className="h-4 w-4" aria-hidden />}
        </button>
        <button type="button" className="mx-auto flex items-center gap-2 text-sm font-semibold text-forest-800 hover:underline" onClick={() => send({ type: "CHANGE_NUMBER" })}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Change Mobile Number
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
        close();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-[820px] overflow-hidden rounded-2xl border border-beige-300 bg-cream p-0 text-ink shadow-2xl backdrop:bg-forest-950/60"
    >
      <div className="grid max-h-[calc(100dvh-2rem)] overflow-y-auto md:grid-cols-[38%_1fr]">
        <BrandPanel />
        <div className="relative flex flex-col px-5 pb-8 pt-6 sm:px-9 md:pl-8">
          <Seam />
          <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-forest-900 hover:bg-beige">
            <X className="h-5 w-5" aria-hidden />
          </button>
          {showProgress && (
            <div className="mb-6 pr-10">
              <Progress step={state.step} />
            </div>
          )}
          <div className={showProgress ? "mt-2 w-full" : "my-auto w-full py-2"}>{body}</div>
          {/* Invisible reCAPTCHA Firebase needs before it sends an SMS. */}
          <div ref={recaptchaRef} />
        </div>
      </div>
    </dialog>
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
