"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { ArrowLeft, ArrowRight, Check, Heart, Info, Leaf, Loader2, Mail, Package, Phone, ShoppingCart, User, X } from "lucide-react";
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

function BrandPanel() {
  return (
    <div className="relative overflow-hidden bg-[radial-gradient(120%_90%_at_0%_0%,var(--color-forest-700),var(--color-forest-950))] text-white">
      {/* Phones: a compact header. */}
      <div className="flex items-center gap-3 px-5 py-4 md:hidden">
        <span className="inline-flex rounded-lg bg-cream px-2 py-1">
          <Image src="/images/logo.png" alt="Reshmam" width={96} height={51} className="h-8 w-auto" />
        </span>
        <p className="font-bookman text-lg leading-tight">
          Create Your <span className="text-gold">Account</span>
        </p>
      </div>
      {/* Tablets and up: the full brand panel. */}
      <div className="hidden h-full flex-col px-7 py-8 md:flex">
        {/* The logo's green lettering needs a light background to read on green (as in the footer). */}
        <span className="inline-flex w-fit rounded-xl bg-cream px-3 py-2 shadow-sm">
          <Image src="/images/logo.png" alt="Reshmam" width={150} height={80} className="h-14 w-auto" />
        </span>
        <p className="mt-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-gold">Pure. Traditional. Trusted.</p>
        <p className="font-bookman mt-6 text-3xl leading-tight">
          Create Your
          <br />
          <span className="text-gold">Account</span>
        </p>
        <ul className="mt-6 space-y-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
              <span className="text-sm leading-snug">
                <span className="block font-semibold">{title}</span>
                <span className="text-white/75">{text}</span>
              </span>
            </li>
          ))}
        </ul>
        <Leaf className="pointer-events-none absolute -bottom-6 -right-6 h-40 w-40 rotate-12 text-white/5" aria-hidden />
      </div>
    </div>
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
    <ol className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-soft" aria-label="Steps">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.key} className="flex items-center gap-1.5" aria-current={active ? "step" : undefined}>
            <span
              className={`grid h-5 w-5 place-items-center rounded-full text-[0.65rem] font-bold ${
                done ? "bg-forest-700 text-white" : active ? "bg-forest-800 text-white" : "bg-beige text-forest-900"
              }`}
            >
              {done ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
            </span>
            <span className={active ? "font-semibold text-forest-900" : ""}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

const primaryBtn =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-forest-800 px-5 font-semibold text-white hover:bg-forest-900 disabled:opacity-60";
const fieldBox = "flex min-h-12 items-center gap-2 rounded-lg border border-beige-300 bg-white px-3 focus-within:border-forest-800 focus-within:ring-2 focus-within:ring-forest-800/20";

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
      created: { title: "Account Created Successfully!", text: "Welcome to Reshmam!" },
      loggedIn: { title: "Logged In Successfully!", text: "Welcome back to Reshmam!" },
      welcomeBack: { title: "Welcome Back!", text: "You already have an account with this number, so we've logged you in." },
    }[state.outcome ?? "loggedIn"];
    body = (
      <div className="flex flex-col items-center text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-forest-700 text-white shadow-[0_0_0_8px_rgba(201,149,67,0.18)]">
          <Check className="h-9 w-9" aria-hidden strokeWidth={3} />
        </span>
        <h2 id={titleId} className="font-bookman mt-6 text-2xl text-forest-800 sm:text-3xl">
          {copy.title}
        </h2>
        <p className="mt-3 text-ink-soft">{copy.text}</p>
        <div className="mt-8 grid w-full gap-3">
          <button type="button" className={primaryBtn} onClick={close} autoFocus>
            Continue Shopping <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-beige-300 bg-white font-semibold text-forest-900 hover:border-forest-800"
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
          <span className="mb-1.5 block text-sm font-semibold text-forest-900">
            Full Name <span className="text-red-600">*</span>
          </span>
          <span className={fieldBox}>
            <User className="h-4 w-4 text-ink-soft" aria-hidden />
            <input name="name" required defaultValue={state.name} autoComplete="name" placeholder="Enter your full name" className="w-full bg-transparent outline-none" autoFocus aria-describedby={state.error ? errorId : undefined} />
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-forest-900">
            Email Address <span className="font-normal text-ink-soft">(Optional)</span>
          </span>
          <span className={fieldBox}>
            <Mail className="h-4 w-4 text-ink-soft" aria-hidden />
            <input name="email" type="email" defaultValue={state.email} autoComplete="email" placeholder="Enter your email address" className="w-full bg-transparent outline-none" />
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
          <span className="mb-1.5 block text-sm font-semibold text-forest-900">
            Mobile Number {create && <span className="text-red-600">*</span>}
          </span>
          <span className={fieldBox}>
            <Phone className="h-4 w-4 text-ink-soft" aria-hidden />
            <span className="font-semibold text-forest-900">+91</span>
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              defaultValue={state.phone}
              placeholder="Enter your 10-digit mobile number"
              className="w-full bg-transparent outline-none"
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
          <p className="flex gap-2 rounded-lg border border-gold/40 bg-beige/60 p-3 text-xs text-ink-soft">
            <Info className="h-4 w-4 shrink-0 text-gold-700" aria-hidden /> We&apos;ll send a one-time password (OTP) to verify your mobile number.
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
        <p className="text-center text-sm text-ink-soft">
          {resendIn > 0 ? (
            <>
              Resend OTP in <span className="font-semibold text-forest-900">00:{String(resendIn).padStart(2, "0")}</span>
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
        <button type="button" className="mx-auto flex items-center gap-2 text-sm font-semibold text-forest-800" onClick={() => send({ type: "CHANGE_NUMBER" })}>
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
      className="m-auto w-[calc(100%-2rem)] max-w-[880px] overflow-hidden rounded-2xl bg-cream p-0 text-ink shadow-2xl backdrop:bg-forest-950/60"
    >
      <div className="grid max-h-[calc(100dvh-2rem)] overflow-y-auto md:grid-cols-[2fr_3fr]">
        <BrandPanel />
        <div className="relative px-5 pb-8 pt-6 sm:px-10">
          <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-forest-900 hover:bg-beige">
            <X className="h-5 w-5" aria-hidden />
          </button>
          {state.mode === "create" && state.step !== "done" && !state.verified && (
            <div className="mb-6 pr-10">
              <Progress step={state.step} />
            </div>
          )}
          <div className={state.step === "done" ? "py-6" : ""}>{body}</div>
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
      <Leaf className="mx-auto h-7 w-7 text-forest-700" aria-hidden />
      <h2 id={id} className="font-bookman mt-2 text-2xl text-forest-800 sm:text-[1.7rem]">
        {title}
      </h2>
      <p className="mt-2 text-sm text-ink-soft">{text}</p>
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
