// The six-box OTP input: typing moves to the next box, a pasted or autofilled code (with spaces or dashes)
// fills the boxes, and Backspace in an empty box steps back.
import { describe, expect, it } from "vitest";
import { applyOtpBackspace, applyOtpInput } from "@/app/(storefront)/_components/account/otp";

const empty = () => ["", "", "", "", "", ""];

describe("applyOtpInput", () => {
  it("typing a digit fills the box and moves on", () => {
    expect(applyOtpInput(empty(), 0, "4")).toEqual({ digits: ["4", "", "", "", "", ""], focus: 1 });
  });
  it("ignores a non-digit", () => {
    expect(applyOtpInput(empty(), 2, "a")).toEqual({ digits: empty(), focus: 2 });
  });
  it.each(["123 456", "123-456", "123456"])("pasting %j fills all six", (paste) => {
    expect(applyOtpInput(empty(), 0, paste)).toEqual({ digits: ["1", "2", "3", "4", "5", "6"], focus: 5 });
  });
  it("pasting two digits at index 4 fills 4 and 5", () => {
    expect(applyOtpInput(empty(), 4, "12")).toEqual({ digits: ["", "", "", "", "1", "2"], focus: 5 });
  });
  it("a full code pasted into any box fills from the first box", () => {
    expect(applyOtpInput(empty(), 3, "654321").digits).toEqual(["6", "5", "4", "3", "2", "1"]);
  });
  it("typing over a filled box replaces it", () => {
    expect(applyOtpInput(["1", "2", "", "", "", ""], 1, "29").digits.slice(0, 2)).toEqual(["1", "9"]);
  });
  it("the last box keeps focus", () => {
    expect(applyOtpInput(["1", "2", "3", "4", "5", ""], 5, "6").focus).toBe(5);
  });
});

describe("applyOtpBackspace", () => {
  it("in an empty box clears the previous one and focuses it", () => {
    expect(applyOtpBackspace(["1", "2", "3", "", "", ""], 3)).toEqual({ digits: ["1", "2", "", "", "", ""], focus: 2 });
  });
  it("in a filled box clears it and stays", () => {
    expect(applyOtpBackspace(["1", "2", "3", "", "", ""], 2)).toEqual({ digits: ["1", "2", "", "", "", ""], focus: 2 });
  });
  it("in the first empty box does nothing", () => {
    expect(applyOtpBackspace(empty(), 0)).toEqual({ digits: empty(), focus: 0 });
  });
});
