// The email a customer types to sign up or log in, tidied before it goes to Firebase.
import { describe, expect, it } from "vitest";
import { parseEmail } from "@/app/(storefront)/_lib/account-identity";

describe("parseEmail", () => {
  it("trims and lowercases", () => expect(parseEmail("  Ravi@Example.COM ")).toBe("ravi@example.com"));

  it.each(["", "ravi", "priya_k", "ravi@", "ravi@example", "@example.com", "ra vi@example.com"])("refuses %j", (input) =>
    expect(parseEmail(input)).toBeNull(),
  );
});
