"use client";

import { useEffect, useState } from "react";
import { useToastStore, type Toast as ToastItem } from "@/store/toastStore";

const TOAST_LIFETIME_MS = 3000;
const FADE_OUT_MS = 300;

function ToastCard({ toast }: { toast: ToastItem }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setLeaving(true), TOAST_LIFETIME_MS - FADE_OUT_MS);
    const removeTimer = setTimeout(() => removeToast(toast.id), TOAST_LIFETIME_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, removeToast]);

  const toneClass =
    toast.type === "success"
      ? "bg-emerald-600 text-white"
      : toast.type === "error"
        ? "bg-red-700 text-white"
        : "bg-amber-400 text-slate-950";

  return (
    <div
      className={`pointer-events-auto rounded-lg px-4 py-3 shadow-lg transition-all duration-300 ease-out ${
        leaving ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
      } ${toneClass}`}
      role="status"
      aria-live="polite"
    >
      <p className="font-body text-[13px] font-medium">{toast.message}</p>
    </div>
  );
}

export function Toast() {
  const toasts = useToastStore((s) => s.toasts);
  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[120] flex justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  );
}
