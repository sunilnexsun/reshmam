import { INVALID_IDENTIFIER, MIN_PASSWORD_LENGTH, parseIdentifier, type Identifier } from "@storefront/_lib/account-identity";
import { normalizeIndianMobile } from "@storefront/_lib/phone";

/**
 * The sign-in dialog as a pure reducer: it checks what was typed and, when it's fine, sets `pending` and
 * `request` so the dialog makes the Firebase call and dispatches the result.
 */

export type Mode = "create" | "login" | "forgot";
export type Outcome = "created" | "loggedIn" | "resetSent";

/** The Firebase call the dialog should make next. */
export type Request =
  | { kind: "create"; id: Identifier; phone: string; password: string }
  | { kind: "login"; id: Identifier; password: string }
  | { kind: "reset"; email: string };

export type SignInState = {
  mode: Mode;
  /** What was typed in "Username or email", kept when switching between modes. */
  identifier: string;
  /** Waiting on Firebase. */
  pending: boolean;
  request: Request | null;
  error: string | null;
  outcome: Outcome | null;
};

export type SignInEvent =
  | { type: "CREATE_SUBMITTED"; identifier: string; phone: string; password: string; confirm: string }
  | { type: "LOGIN_SUBMITTED"; identifier: string; password: string }
  | { type: "RESET_SUBMITTED"; identifier: string }
  | { type: "SUCCEEDED" }
  | { type: "SWITCH_MODE"; mode: Mode }
  | { type: "ERROR"; message: string }
  | { type: "RESET"; mode: Mode };

export const INVALID_MOBILE = "Enter a valid 10-digit mobile number.";
export const SHORT_PASSWORD = `Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`;
export const PASSWORDS_DIFFER = "The two passwords don't match.";
export const RESET_NEEDS_EMAIL =
  "Password reset links go to an email. If you signed up with a username, please call us and we'll help.";

export function initialSignInState(mode: Mode, identifier = ""): SignInState {
  return { mode, identifier, pending: false, request: null, error: null, outcome: null };
}

const fail = (state: SignInState, error: string, identifier: string): SignInState => ({
  ...state,
  identifier,
  pending: false,
  request: null,
  error,
});

const start = (state: SignInState, request: Request, identifier: string): SignInState => ({
  ...state,
  identifier,
  pending: true,
  request,
  error: null,
});

export function signInReducer(state: SignInState, event: SignInEvent): SignInState {
  switch (event.type) {
    case "CREATE_SUBMITTED": {
      const id = parseIdentifier(event.identifier);
      if (!id) return fail(state, INVALID_IDENTIFIER, event.identifier);
      const phone = normalizeIndianMobile(event.phone);
      if (!phone) return fail(state, INVALID_MOBILE, event.identifier);
      if (event.password.length < MIN_PASSWORD_LENGTH) return fail(state, SHORT_PASSWORD, event.identifier);
      if (event.password !== event.confirm) return fail(state, PASSWORDS_DIFFER, event.identifier);
      return start(state, { kind: "create", id, phone, password: event.password }, event.identifier);
    }
    case "LOGIN_SUBMITTED": {
      const id = parseIdentifier(event.identifier);
      if (!id) return fail(state, INVALID_IDENTIFIER, event.identifier);
      if (!event.password) return fail(state, "Enter your password.", event.identifier);
      return start(state, { kind: "login", id, password: event.password }, event.identifier);
    }
    case "RESET_SUBMITTED": {
      const id = parseIdentifier(event.identifier);
      if (!id) return fail(state, INVALID_IDENTIFIER, event.identifier);
      if (id.kind !== "email") return fail(state, RESET_NEEDS_EMAIL, event.identifier);
      return start(state, { kind: "reset", email: id.email }, event.identifier);
    }
    case "SUCCEEDED": {
      const outcome: Outcome = state.mode === "create" ? "created" : state.mode === "forgot" ? "resetSent" : "loggedIn";
      return { ...state, pending: false, request: null, error: null, outcome };
    }
    case "SWITCH_MODE":
      return initialSignInState(event.mode, state.identifier);
    case "RESET":
      return initialSignInState(event.mode);
    case "ERROR":
      return { ...state, pending: false, request: null, error: event.message };
  }
}
