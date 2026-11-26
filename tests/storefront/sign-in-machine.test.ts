// The sign-in dialog: Create Account (username or email, mobile, password, confirm), Log In (username or email,
// password) and Forgot password (email only). The reducer checks what was typed before any Firebase call.
import { describe, expect, it } from "vitest";
import {
  initialSignInState,
  INVALID_MOBILE,
  PASSWORDS_DIFFER,
  RESET_NEEDS_EMAIL,
  SHORT_PASSWORD,
  signInReducer,
  type SignInEvent,
  type SignInState,
} from "@/app/(storefront)/_components/account/sign-in-machine";
import { INVALID_IDENTIFIER } from "@/app/(storefront)/_lib/account-identity";

const run = (state: SignInState, ...events: SignInEvent[]) => events.reduce(signInReducer, state);
const create = (over: Partial<Extract<SignInEvent, { type: "CREATE_SUBMITTED" }>> = {}): SignInEvent => ({
  type: "CREATE_SUBMITTED",
  identifier: "Priya_K",
  phone: "98765 43210",
  password: "secret123",
  confirm: "secret123",
  ...over,
});

describe("signInReducer", () => {
  it("create with a username asks for that account, with the mobile as 10 digits", () => {
    const s = run(initialSignInState("create"), create());
    expect(s).toMatchObject({ pending: true, error: null, identifier: "Priya_K" });
    expect(s.request).toEqual({ kind: "create", id: { kind: "username", username: "priya_k" }, phone: "9876543210", password: "secret123" });
    expect(run(s, { type: "SUCCEEDED" })).toMatchObject({ pending: false, request: null, outcome: "created" });
  });
  it("create with an email", () => {
    const s = run(initialSignInState("create"), create({ identifier: " Ravi@Example.com " }));
    expect(s.request).toMatchObject({ kind: "create", id: { kind: "email", email: "ravi@example.com" } });
  });
  it.each([
    ["a bad username or email", { identifier: "ab" }, INVALID_IDENTIFIER],
    ["a bad email", { identifier: "ravi@example" }, INVALID_IDENTIFIER],
    ["a bad mobile number", { phone: "12345" }, INVALID_MOBILE],
    ["a short password", { password: "short", confirm: "short" }, SHORT_PASSWORD],
    ["passwords that don't match", { confirm: "secret124" }, PASSWORDS_DIFFER],
  ])("create refuses %s and calls nothing", (_, over, error) => {
    const s = run(initialSignInState("create"), create(over));
    expect(s).toMatchObject({ pending: false, request: null, error, outcome: null });
  });
  it("log in with a username or email and a password", () => {
    const s = run(initialSignInState("login"), { type: "LOGIN_SUBMITTED", identifier: "priya_k", password: "secret123" });
    expect(s.request).toEqual({ kind: "login", id: { kind: "username", username: "priya_k" }, password: "secret123" });
    expect(run(s, { type: "SUCCEEDED" }).outcome).toBe("loggedIn");
  });
  it("log in needs a password", () => {
    const s = run(initialSignInState("login"), { type: "LOGIN_SUBMITTED", identifier: "priya_k", password: "" });
    expect(s).toMatchObject({ pending: false, request: null, error: "Enter your password." });
  });
  it("forgot password sends a link to an email, but not for a username", () => {
    const sent = run(initialSignInState("forgot"), { type: "RESET_SUBMITTED", identifier: "Ravi@example.com" });
    expect(sent.request).toEqual({ kind: "reset", email: "ravi@example.com" });
    expect(run(sent, { type: "SUCCEEDED" }).outcome).toBe("resetSent");
    const refused = run(initialSignInState("forgot"), { type: "RESET_SUBMITTED", identifier: "priya_k" });
    expect(refused).toMatchObject({ pending: false, request: null, error: RESET_NEEDS_EMAIL });
  });
  it("ERROR shows the message and stops waiting", () => {
    const s = run(initialSignInState("login"), { type: "LOGIN_SUBMITTED", identifier: "priya_k", password: "x" }, { type: "ERROR", message: "Nope" });
    expect(s).toMatchObject({ pending: false, request: null, error: "Nope" });
  });
  it("SWITCH_MODE keeps what was typed in Username or Email; RESET clears it", () => {
    const typed = run(initialSignInState("login"), { type: "LOGIN_SUBMITTED", identifier: "ravi@example.com", password: "" });
    expect(run(typed, { type: "SWITCH_MODE", mode: "forgot" })).toEqual(initialSignInState("forgot", "ravi@example.com"));
    expect(run(typed, { type: "RESET", mode: "create" })).toEqual(initialSignInState("create"));
  });
});
