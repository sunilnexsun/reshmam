// The sign-in dialog's steps: Create Account (details → mobile → OTP → done) and Log In (mobile → OTP → done),
// including a "log in" by someone with no account yet, and a "create" by someone who already has one.
import { describe, expect, it } from "vitest";
import { initialSignInState, signInReducer, type SignInEvent, type SignInState } from "@/app/(storefront)/_components/account/sign-in-machine";

const run = (state: SignInState, ...events: SignInEvent[]) => events.reduce(signInReducer, state);

describe("signInReducer", () => {
  it("create: details → mobile → otp → done (created)", () => {
    let s = initialSignInState("create");
    expect(s.step).toBe("details");
    s = run(s, { type: "DETAILS_SUBMITTED", name: "Priya", email: "" });
    expect(s).toMatchObject({ step: "mobile", name: "Priya" });
    s = run(s, { type: "MOBILE_SUBMITTED", phone: "+91 98765 43210" });
    expect(s).toMatchObject({ step: "mobile", phone: "9876543210", pending: true, error: null });
    s = run(s, { type: "OTP_SENT" });
    expect(s).toMatchObject({ step: "otp", pending: false });
    s = run(s, { type: "CODE_CHANGED", code: "123456" }, { type: "OTP_CONFIRMED", hasProfile: false });
    expect(s).toMatchObject({ step: "done", outcome: "created" });
  });

  it("create with an existing account → welcomeBack", () => {
    const s = run(initialSignInState("create"), { type: "DETAILS_SUBMITTED", name: "P", email: "" }, { type: "MOBILE_SUBMITTED", phone: "9876543210" }, { type: "OTP_SENT" }, { type: "OTP_CONFIRMED", hasProfile: true });
    expect(s).toMatchObject({ step: "done", outcome: "welcomeBack" });
  });

  it("login with an account → loggedIn", () => {
    const s = run(initialSignInState("login"), { type: "MOBILE_SUBMITTED", phone: "9876543210" }, { type: "OTP_SENT" }, { type: "OTP_CONFIRMED", hasProfile: true });
    expect(s).toMatchObject({ step: "done", outcome: "loggedIn" });
  });

  it("login without an account → details in create mode, phone kept and already verified", () => {
    const s = run(initialSignInState("login"), { type: "MOBILE_SUBMITTED", phone: "9876543210" }, { type: "OTP_SENT" }, { type: "OTP_CONFIRMED", hasProfile: false });
    expect(s).toMatchObject({ step: "details", mode: "create", phone: "9876543210", verified: true, outcome: null });
  });

  it("details after a verified login go straight to saving, then created", () => {
    let s = run(initialSignInState("login"), { type: "MOBILE_SUBMITTED", phone: "9876543210" }, { type: "OTP_SENT" }, { type: "OTP_CONFIRMED", hasProfile: false });
    s = run(s, { type: "DETAILS_SUBMITTED", name: "Ravi", email: "" });
    expect(s).toMatchObject({ step: "details", pending: true });
    s = run(s, { type: "OTP_CONFIRMED", hasProfile: false });
    expect(s).toMatchObject({ step: "done", outcome: "created" });
  });

  it("CHANGE_NUMBER from otp → mobile with the code cleared", () => {
    const s = run(initialSignInState("login"), { type: "MOBILE_SUBMITTED", phone: "9876543210" }, { type: "OTP_SENT" }, { type: "CODE_CHANGED", code: "12" }, { type: "CHANGE_NUMBER" });
    expect(s).toMatchObject({ step: "mobile", code: "" });
  });

  it("an invalid mobile number stays on mobile with an error and sends nothing", () => {
    const s = run(initialSignInState("login"), { type: "MOBILE_SUBMITTED", phone: "12345" });
    expect(s).toMatchObject({ step: "mobile", pending: false, error: "Enter a valid 10-digit mobile number." });
  });

  it("needs a name; a bad email is refused, a blank one is fine", () => {
    expect(run(initialSignInState("create"), { type: "DETAILS_SUBMITTED", name: "  ", email: "" })).toMatchObject({ step: "details", error: "Please enter your full name." });
    expect(run(initialSignInState("create"), { type: "DETAILS_SUBMITTED", name: "P", email: "nope" })).toMatchObject({ step: "details", error: "Enter a valid email address, or leave it blank." });
  });

  it("OTP_SUBMITTED needs all six digits", () => {
    const s = run(initialSignInState("login"), { type: "MOBILE_SUBMITTED", phone: "9876543210" }, { type: "OTP_SENT" }, { type: "CODE_CHANGED", code: "123" }, { type: "OTP_SUBMITTED" });
    expect(s).toMatchObject({ pending: false, error: "Enter the 6-digit code from the SMS." });
    expect(run(s, { type: "CODE_CHANGED", code: "123456" }, { type: "OTP_SUBMITTED" })).toMatchObject({ pending: true, error: null });
  });

  it("ERROR shows the message and stops waiting", () => {
    const s = run(initialSignInState("login"), { type: "MOBILE_SUBMITTED", phone: "9876543210" }, { type: "ERROR", message: "Boom" });
    expect(s).toMatchObject({ pending: false, error: "Boom", step: "mobile" });
  });

  it("SWITCH_MODE and RESET start over", () => {
    expect(run(initialSignInState("create"), { type: "SWITCH_MODE", mode: "login" })).toEqual(initialSignInState("login"));
    expect(run(initialSignInState("login"), { type: "MOBILE_SUBMITTED", phone: "9876543210" }, { type: "RESET", mode: "create" })).toEqual(initialSignInState("create"));
  });
});
