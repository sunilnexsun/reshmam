import { normalizeIndianMobile } from "@storefront/_lib/phone";

/** The sign-in dialog's steps as a pure reducer; the dialog does the Firebase calls and dispatches results. */

export type Mode = "create" | "login";
export type Step = "details" | "mobile" | "otp" | "done";
export type Outcome = "created" | "loggedIn" | "welcomeBack";

export type SignInState = {
  mode: Mode;
  step: Step;
  name: string;
  email: string;
  /** 10 digits once accepted. */
  phone: string;
  code: string;
  /** Waiting on Firebase (sending the SMS, checking the code or saving the profile). */
  pending: boolean;
  error: string | null;
  /** The phone number is verified and the customer is signed in, but has no profile yet. */
  verified: boolean;
  outcome: Outcome | null;
};

export type SignInEvent =
  | { type: "DETAILS_SUBMITTED"; name: string; email: string }
  | { type: "MOBILE_SUBMITTED"; phone: string }
  | { type: "OTP_SENT" }
  | { type: "CODE_CHANGED"; code: string }
  | { type: "OTP_SUBMITTED" }
  | { type: "OTP_CONFIRMED"; hasProfile: boolean }
  | { type: "CHANGE_NUMBER" }
  | { type: "SWITCH_MODE"; mode: Mode }
  | { type: "ERROR"; message: string }
  | { type: "RESET"; mode: Mode };

export const INVALID_MOBILE = "Enter a valid 10-digit mobile number.";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initialSignInState(mode: Mode): SignInState {
  return { mode, step: mode === "create" ? "details" : "mobile", name: "", email: "", phone: "", code: "", pending: false, error: null, verified: false, outcome: null };
}

export function signInReducer(state: SignInState, event: SignInEvent): SignInState {
  switch (event.type) {
    case "DETAILS_SUBMITTED": {
      const name = event.name.trim();
      const email = event.email.trim();
      if (!name) return { ...state, error: "Please enter your full name." };
      if (email && !EMAIL.test(email)) return { ...state, error: "Enter a valid email address, or leave it blank." };
      // Already verified (came from Log In with no account): the dialog saves the profile next.
      if (state.verified) return { ...state, name, email, pending: true, error: null };
      return { ...state, name, email, step: "mobile", error: null };
    }
    case "MOBILE_SUBMITTED": {
      const phone = normalizeIndianMobile(event.phone);
      if (!phone) return { ...state, pending: false, error: INVALID_MOBILE };
      return { ...state, phone, pending: true, error: null };
    }
    case "OTP_SENT":
      return { ...state, step: "otp", code: "", pending: false, error: null };
    case "CODE_CHANGED":
      return { ...state, code: event.code, error: null };
    case "OTP_SUBMITTED":
      if (!/^\d{6}$/.test(state.code)) return { ...state, error: "Enter the 6-digit code from the SMS." };
      return { ...state, pending: true, error: null };
    case "OTP_CONFIRMED": {
      const base = { ...state, pending: false, error: null, code: "" };
      if (event.hasProfile) return { ...base, step: "done", outcome: state.mode === "create" ? "welcomeBack" : "loggedIn" };
      if (state.mode === "create") return { ...base, step: "done", outcome: "created" };
      return { ...base, mode: "create", step: "details", verified: true };
    }
    case "CHANGE_NUMBER":
      return { ...state, step: "mobile", code: "", pending: false, error: null };
    case "SWITCH_MODE":
    case "RESET":
      return initialSignInState(event.mode);
    case "ERROR":
      return { ...state, pending: false, error: event.message };
  }
}
