"use client";

import { useId, type ReactNode } from "react";

export type ConfirmDestructiveModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  message: ReactNode;
  /** Red primary action label (default "Delete"). */
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
};

/**
 * Preline-style overlay for destructive confirmations — never runs `onConfirm` until the user taps the red button.
 */
export function ConfirmDestructiveModal({
  open,
  onClose,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  busy = false,
}: ConfirmDestructiveModalProps) {
  const titleId = useId();

  return (
    <div
      className={`hs-overlay fixed start-0 top-0 z-[80] size-full overflow-x-hidden overflow-y-auto ${
        open ? "pointer-events-auto bg-black/70" : "pointer-events-none hidden"
      }`}
      role="dialog"
      aria-modal={open}
      aria-hidden={!open}
      aria-labelledby={titleId}
      onClick={(e) => {
        if (busy) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex min-h-full items-end justify-center py-4 sm:items-center">
        <div
          className="pointer-events-auto m-3 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-xl sm:m-0 sm:p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id={titleId} className="app-modal-title">
            {title}
          </h2>
          <div className="mt-3 font-body text-sm leading-relaxed text-slate-300">{message}</div>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              className="min-h-11 flex-1 rounded-lg px-4 py-2.5 text-center font-body text-sm font-medium text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-slate-100 disabled:opacity-50"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-destructive-solid min-h-11 flex-1 disabled:opacity-60"
              disabled={busy}
              onClick={() => void onConfirm()}
            >
              {busy ? "Deleting…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
