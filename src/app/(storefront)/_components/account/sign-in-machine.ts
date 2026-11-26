import { INVALID_EMAIL, MIN_PASSWORD_LENGTH, parseEmail } from "@storefront/_lib/account-identity";
import { normalizeIndianMobile } from "@storefront/_lib/phone";

/**
 * The sign-in dialog as a pure reducer: it checks what was typed and, when it's fine, sets `pending` and
 * `request` so the dialog makes the Firebase call and dispatches the result.
 */

export type Mode = "create" | "login" | "forgot";
export type Outcome = "created" | "loggedIn" | "resetSent";

/** The Firebase call the dialog should make next. */
export type Request =
  | { kind: "create"; email: string; phone: string; password: string }
  | { kind: "login"; email: string; password: string }
  | { kind: "reset"; email: string };

export type SignInState = {
  mode: Mode;
  /** What was typed in Email, kept when switching between modes. */
  email: string;
  /** Waiting on Firebase. */
  pending: boolean;
  request: Request | null;
  error: string | null;
  outcome: Outcome | null;
};

export type SignInEvent =
  | { type: "CREATE_SUBMITTED"; email: string; phone: string; password: string; confirm: string }
  | { type: "LOGIN_SUBMITTED"; email: string; password: string }
  | { type: "RESET_SUBMITTED"; email: string }
  | { type: "SUCCEEDED" }
  | { type: "SWITCH_MODE"; mode: Mode }
  | { type: "ERROR"; message: string }
  | { type: "RESET"; mode: Mode };

export const INVALID_MOBILE = "Enter a valid 10-digit mobile number.";
export const SHORT_PASSWORD = `Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`;
export const PASSWORDS_DIFFER = "The two passwords don't match.";

export function initialSignInState(mode: Mode, email = ""): SignInState {
  return { mode, email, pending: false, request: null, error: null, outcome: null };
}

const fail = (state: SignInState, error: string, email: string): SignInState => ({
  ...state,
  email,
  pending: false,
  request: null,
  error,
});

const start = (state: SignInState, request: Request, email: string): SignInState => ({
  ...state,
  email,
  pending: true,
  request,
  error: null,
});

export function signInReducer(state: SignInState, event: SignInEvent): SignInState {
  switch (event.type) {
    case "CREATE_SUBMITTED": {
      const email = parseEmail(event.email);
      if (!email) return fail(state, INVALID_EMAIL, event.email);
      const phone = normalizeIndianMobile(event.phone);
      if (!phone) return fail(state, INVALID_MOBILE, event.email);
      if (event.password.length < MIN_PASSWORD_LENGTH) return fail(state, SHORT_PASSWORD, event.email);
      if (event.password !== event.confirm) return fail(state, PASSWORDS_DIFFER, event.email);
      return start(state, { kind: "create", email, phone, password: event.password }, event.email);
    }
    case "LOGIN_SUBMITTED": {
      const email = parseEmail(event.email);
      if (!email) return fail(state, INVALID_EMAIL, event.email);
      if (!event.password) return fail(state, "Enter your password.", event.email);
      return start(state, { kind: "login", email, password: event.password }, event.email);
    }
    case "RESET_SUBMITTED": {
      const email = parseEmail(event.email);
      if (!email) return fail(state, INVALID_EMAIL, event.email);
      return start(state, { kind: "reset", email }, event.email);
    }
    case "SUCCEEDED": {
      const outcome: Outcome = state.mode === "create" ? "created" : state.mode === "forgot" ? "resetSent" : "loggedIn";
      return { ...state, pending: false, request: null, error: null, outcome };
    }
    case "SWITCH_MODE":
      return initialSignInState(event.mode, state.email);
    case "RESET":
      return initialSignInState(event.mode);
    case "ERROR":
      return { ...state, pending: false, request: null, error: event.message };
  }
}
