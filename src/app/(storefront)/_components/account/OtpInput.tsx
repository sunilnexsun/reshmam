"use client";

import { useEffect, useRef } from "react";
import { applyOtpBackspace, applyOtpInput, OTP_LENGTH } from "./otp";

type Props = {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  invalid?: boolean;
};

/** Six one-digit boxes for the SMS code. Paste and SMS autofill (one-time-code) fill every box. */
export function OtpInput({ value, onChange, disabled, autoFocus, invalid }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const apply = ({ digits: next, focus }: { digits: string[]; focus: number }) => {
    onChange(next.join(""));
    const el = refs.current[focus];
    el?.focus();
    el?.select();
  };

  return (
    <div className="flex gap-2 sm:gap-3" role="group" aria-label="One-time password">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
          aria-invalid={invalid || undefined}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => apply(applyOtpInput(digits, i, e.target.value))}
          onPaste={(e) => {
            e.preventDefault();
            apply(applyOtpInput(digits, i, e.clipboardData.getData("text")));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              apply(applyOtpBackspace(digits, i));
            } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            else if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
          }}
          className={`h-12 w-11 rounded-lg border bg-white text-center text-lg font-semibold text-forest-900 outline-none focus:border-forest-800 focus:ring-2 focus:ring-forest-800/20 disabled:opacity-60 sm:h-14 sm:w-12 ${
            invalid ? "border-red-500" : "border-beige-300"
          }`}
        />
      ))}
    </div>
  );
}
