"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

type Toast = { id: number; message: string; action?: { href: string; label: string } };
let push: ((t: Omit<Toast, "id">) => void) | null = null;

export function toast(message: string, action?: Toast["action"]) {
  push?.({ message, action });
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    push = (t) => {
      const id = Date.now() + Math.random();
      setToasts((list) => [...list.slice(-2), { ...t, id }]);
      window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 4000);
    };
    return () => {
      push = null;
    };
  }, []);

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[min(92vw,380px)] -translate-x-1/2 flex-col gap-2 sm:left-6 sm:translate-x-0"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 rounded-xl bg-forest-900 px-4 py-3 text-sm text-white shadow-card-hover"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-leaf-100" aria-hidden />
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <Link href={t.action.href} className="font-semibold underline underline-offset-2">
              {t.action.label}
            </Link>
          )}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToasts((l) => l.filter((x) => x.id !== t.id))}
            className="rounded p-1 hover:bg-white/10"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
