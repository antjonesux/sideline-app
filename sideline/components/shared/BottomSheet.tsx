"use client";

import { modalCtaFooterClass, modalDialogTitleClass, overlayZ } from "@/lib/constants/designTokens";
import { useScrollLock } from "@/lib/useScrollLock";
import { cn } from "@/lib/utils";
import { useEffect, useId, type ReactNode } from "react";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  description,
  contentClassName,
  shellClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Screen-reader-only context below the title. */
  description?: string;
  contentClassName?: string;
  shellClassName?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className={cn("fixed inset-0 bg-black/60", overlayZ.radixDialog)} aria-hidden onClick={onClose} />
      <div
        className={cn("fixed inset-x-0 bottom-0 left-0 w-full", overlayZ.sheetShell, shellClassName)}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "flex w-full max-h-[90dvh] flex-col overflow-hidden border-t border-slate-700 bg-slate-900",
            "rounded-t-xl rounded-b-none",
            !footer && "pb-[env(safe-area-inset-bottom,0px)]",
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
            <h2 id={titleId} className={modalDialogTitleClass}>
              {title}
            </h2>
            <button
              type="button"
              data-no-press
              className="-mr-2 p-2 text-slate-400 transition-colors hover:text-white"
              onClick={onClose}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>
          <div className={cn("min-h-0 flex-1 overflow-y-auto p-4 sm:p-6", contentClassName)}>
            {description ? (
              <p id={descriptionId} className="sr-only">
                {description}
              </p>
            ) : null}
            {children}
          </div>
          {footer ? <div className={modalCtaFooterClass}>{footer}</div> : null}
        </div>
      </div>
    </>
  );
}
