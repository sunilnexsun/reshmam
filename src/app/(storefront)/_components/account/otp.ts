/** Pure logic for the six-box OTP input, kept apart from React so it is unit-tested. */

export const OTP_LENGTH = 6;

type OtpState = { digits: string[]; focus: number };

/**
 * A box's new value. One digit: fill this box and move on. Longer: a paste or SMS autofill — non-digits
 * (spaces, dashes) are dropped and the digits fill from this box; a full six-digit code always fills from
 * the first box. Typing into a filled box (its value is then old + new) replaces the digit.
 */
export function applyOtpInput(digits: string[], index: number, value: string): OtpState {
  const old = digits[index] ?? "";
  let raw = value;
  if (old && raw.length === 2 && raw.includes(old)) raw = raw[0] === old ? raw[1] : raw[0];
  const incoming = raw.replace(/\D/g, "");
  if (!incoming) return { digits, focus: index };

  const start = incoming.length >= OTP_LENGTH ? 0 : index;
  const next = [...digits];
  const chars = incoming.slice(0, OTP_LENGTH - start).split("");
  chars.forEach((c, i) => (next[start + i] = c));
  return { digits: next, focus: Math.min(start + chars.length, OTP_LENGTH - 1) };
}

/** Backspace: clears this box, or if it's already empty, the one before it (and moves there). */
export function applyOtpBackspace(digits: string[], index: number): OtpState {
  const next = [...digits];
  if (next[index]) {
    next[index] = "";
    return { digits: next, focus: index };
  }
  if (index === 0) return { digits, focus: 0 };
  next[index - 1] = "";
  return { digits: next, focus: index - 1 };
}
