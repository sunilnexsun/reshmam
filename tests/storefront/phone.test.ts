// Mobile numbers as customers type them: +91, a leading 0, spaces or dashes are all fine; anything that
// isn't a 10-digit Indian mobile is refused before an SMS is sent.
import { describe, expect, it } from "vitest";
import { normalizeIndianMobile, toE164 } from "@/app/(storefront)/_lib/phone";

describe("normalizeIndianMobile", () => {
  it.each(["9876543210", "+91 98765 43210", "09876543210", "98765-43210", "91 9876543210", " +91-98765-43210 "])(
    "accepts %j",
    (input) => expect(normalizeIndianMobile(input)).toBe("9876543210"),
  );
  it.each(["5876543210", "98765", "abc", "", "98765432101234", "+1 9876543210"])("refuses %j", (input) =>
    expect(normalizeIndianMobile(input)).toBeNull(),
  );
});

describe("toE164", () => {
  it("adds the +91 country code", () => expect(toE164("9876543210")).toBe("+919876543210"));
});
