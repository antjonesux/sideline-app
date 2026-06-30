"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ResponsiveOverlay } from "@/components/shared/ResponsiveOverlay";
import { modalCtaFooterClass } from "@/lib/constants/designTokens";
import { type ReactNode } from "react";

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

/** Destructive confirmations — never runs `onConfirm` until the user taps the red button. */
export function ConfirmDestructiveModal({
  open,
  onClose,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  busy = false,
}: ConfirmDestructiveModalProps) {
  return (
    <ResponsiveOverlay open={open} onClose={onClose} busy={busy} maxWidth="md">
      <DialogHeader className="space-y-0 border-b border-slate-800 px-4 py-3 text-left md:px-6 md:text-left">
        <DialogTitle className="pr-10 text-left font-heading text-lg font-bold uppercase tracking-[0.1em] text-slate-100">
          {title}
        </DialogTitle>
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
        <DialogDescription asChild>
          <div className="font-body text-sm leading-relaxed text-slate-300">{message}</div>
        </DialogDescription>
      </div>
      <div className={modalCtaFooterClass}>
        <Button type="button" variant="secondary" className="flex-1 py-3" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" className="flex-1 py-3" disabled={busy} onClick={() => void onConfirm()}>
          {busy ? "Working…" : confirmLabel}
        </Button>
      </div>
    </ResponsiveOverlay>
  );
}
