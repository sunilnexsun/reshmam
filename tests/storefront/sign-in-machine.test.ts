// The sign-in dialog: Create Account (email, mobile, password, confirm), Log In (email, password) and
// Forgot password (email). The reducer checks what was typed before any Firebase call.
import { describe, expect, it } from "vitest";
import {
  initialSignInState,
  INVALID_MOBILE,
  PASSWORDS_DIFFER,
  SHORT_PASSWORD,
  signInReducer,
  type SignInEvent,
  type SignInState,
} from "@/app/(storefront)/_components/account/sign-in-machine";
import { INVALID_EMAIL } from "@/app/(storefront)/_lib/account-identity";

const run = (state: SignInState, ...events: SignInEvent[]) => events.reduce(signInReducer, state);
const create = (over: Partial<Extract<SignInEvent, { type: "CREATE_SUBMITTED" }>> = {}): SignInEvent => ({
  type: "CREATE_SUBMITTED",
  email: " Ravi@Example.com ",
  phone: "98765 43210",
  password: "secret123",
  confirm: "secret123",
  ...over,
});

describe("signInReducer", () => {
  it("create asks for the account with a tidied email and the mobile as 10 digits", () => {
    const s = run(initialSignInState("create"), create());
    expect(s).toMatchObject({ pending: true, error: null });
    expect(s.request).toEqual({ kind: "create", email: "ravi@example.com", phone: "9876543210", password: "secret123" });
    expect(run(s, { type: "SUCCEEDED" })).toMatchObject({ pending: false, request: null, outcome: "created" });
  });
  it.each([
    ["a username instead of an email", { email: "priya_k" }, INVALID_EMAIL],
    ["a bad email", { email: "ravi@example" }, INVALID_EMAIL],
    ["a bad mobile number", { phone: "12345" }, INVALID_MOBILE],
    ["a short password", { password: "short", confirm: "short" }, SHORT_PASSWORD],
    ["passwords that don't match", { confirm: "secret124" }, PASSWORDS_DIFFER],
  ])("create refuses %s and calls nothing", (_, over, error) => {
    const s = run(initialSignInState("create"), create(over));
    expect(s).toMatchObject({ pending: false, request: null, error, outcome: null });
  });
  it("log in with an email and a password", () => {
    const s = run(initialSignInState("login"), { type: "LOGIN_SUBMITTED", email: "ravi@example.com", password: "secret123" });
    expect(s.request).toEqual({ kind: "login", email: "ravi@example.com", password: "secret123" });
    expect(run(s, { type: "SUCCEEDED" }).outcome).toBe("loggedIn");
  });
  it("log in needs a valid email and a password", () => {
    expect(run(initialSignInState("login"), { type: "LOGIN_SUBMITTED", email: "priya_k", password: "x" })).toMatchObject({ request: null, error: INVALID_EMAIL });
    expect(run(initialSignInState("login"), { type: "LOGIN_SUBMITTED", email: "ravi@example.com", password: "" })).toMatchObject({ request: null, error: "Enter your password." });
  });
  it("forgot password sends a link to a valid email", () => {
    const sent = run(initialSignInState("forgot"), { type: "RESET_SUBMITTED", email: "Ravi@example.com" });
    expect(sent.request).toEqual({ kind: "reset", email: "ravi@example.com" });
    expect(run(sent, { type: "SUCCEEDED" }).outcome).toBe("resetSent");
    expect(run(initialSignInState("forgot"), { type: "RESET_SUBMITTED", email: "ravi" })).toMatchObject({ request: null, error: INVALID_EMAIL });
  });
  it("ERROR shows the message and stops waiting", () => {
    const s = run(initialSignInState("login"), { type: "LOGIN_SUBMITTED", email: "ravi@example.com", password: "x" }, { type: "ERROR", message: "Nope" });
    expect(s).toMatchObject({ pending: false, request: null, error: "Nope" });
  });
  it("SWITCH_MODE keeps the email typed; RESET clears it", () => {
    const typed = run(initialSignInState("login"), { type: "LOGIN_SUBMITTED", email: "ravi@example.com", password: "" });
    expect(run(typed, { type: "SWITCH_MODE", mode: "forgot" })).toEqual(initialSignInState("forgot", "ravi@example.com"));
    expect(run(typed, { type: "RESET", mode: "create" })).toEqual(initialSignInState("create"));
  });
});
