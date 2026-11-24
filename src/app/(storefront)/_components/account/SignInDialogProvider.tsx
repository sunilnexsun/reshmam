"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { SignInDialog } from "./SignInDialog";
import type { Mode } from "./sign-in-machine";

type SignInDialogApi = { open(mode?: Mode): void; close(): void };

const SignInDialogContext = createContext<SignInDialogApi>({ open: () => {}, close: () => {} });

/** Opens the Create Account / Log In dialog from anywhere in the storefront. */
export const useSignInDialog = () => useContext(SignInDialogContext);

export function SignInDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; mode: Mode; session: number }>({ open: false, mode: "login", session: 0 });
  const open = useCallback((mode: Mode = "login") => setState((s) => ({ open: true, mode, session: s.session + 1 })), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  const api = useMemo(() => ({ open, close }), [open, close]);
  return (
    <SignInDialogContext.Provider value={api}>
      {children}
      {/* A new key each time it opens, so every visit starts on a clean first step. */}
      {state.open && <SignInDialog key={state.session} initialMode={state.mode} onClose={close} />}
    </SignInDialogContext.Provider>
  );
}
