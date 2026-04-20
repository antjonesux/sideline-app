"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { useId, type ReactNode } from "react";
import { useScrollLock } from "@/lib/useScrollLock";

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
  useScrollLock(open);

  return (
    <div
      className={`hs-overlay fixed inset-0 z-[60] overflow-x-hidden overflow-y-auto ${
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
      <div className="fixed inset-x-0 bottom-0 z-[61] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4">
        <div
          className="pointer-events-auto flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <h2 id={titleId} className="app-modal-title text-lg">
              {title}
            </h2>
            <button type="button" className="app-no-press-scale p-2 -mr-2 text-slate-400 hover:text-white" onClick={onClose}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>
          <div className="overflow-y-auto p-4 sm:p-6">
            <div className="font-body text-sm leading-relaxed text-slate-300">{message}</div>
          </div>
          <div className="flex shrink-0 gap-2 border-t border-slate-800 p-3">
            <button type="button" className="btn-secondary flex-1 py-3" disabled={busy} onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-destructive-solid flex-1 py-3" disabled={busy} onClick={() => void onConfirm()}>
              {busy ? "Working…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
