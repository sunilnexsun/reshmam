// "Username or email": which one was typed, and the address Firebase signs the account in with.
import { describe, expect, it } from "vitest";
import { authEmail, parseIdentifier, USERNAME_EMAIL_DOMAIN } from "@/app/(storefront)/_lib/account-identity";

describe("parseIdentifier", () => {
  it.each([
    ["priya_k", { kind: "username", username: "priya_k" }],
    ["  Priya.K2 ", { kind: "username", username: "priya.k2" }],
    ["Ravi@Example.COM", { kind: "email", email: "ravi@example.com" }],
  ])("%s", (input, expected) => expect(parseIdentifier(input)).toEqual(expected));

  it.each(["", "ab", "_priya", "priya k", "priya-k", "a".repeat(31), "ravi@", "ravi@example", "@example.com"])(
    "refuses %j",
    (input) => expect(parseIdentifier(input)).toBeNull(),
  );
});

describe("authEmail", () => {
  it("is the email itself, or the username on the stand-in domain", () => {
    expect(authEmail({ kind: "email", email: "ravi@example.com" })).toBe("ravi@example.com");
    expect(authEmail({ kind: "username", username: "priya_k" })).toBe(`priya_k@${USERNAME_EMAIL_DOMAIN}`);
    expect(USERNAME_EMAIL_DOMAIN).toBe("customers.reshmam.com"); // firestore.rules repeats this domain
  });
});
