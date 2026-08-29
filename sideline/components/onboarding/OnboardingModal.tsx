"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { overlayZ } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";
import { ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type OnboardingStep = {
  /** Optional muted label above the heading (e.g. welcome step eyebrow). */
  label?: string;
  heading: string;
  body: string;
  visual: ReactNode;
};

type OnboardingModalProps = {
  open: boolean;
  onClose: () => void;
  steps: OnboardingStep[];
  onComplete: () => void;
  /** Accessible name for the X / ESC dismiss control. */
  closeLabel?: string;
  /** Left top-bar label (e.g. "New Enhancements" / "Call Sheets"). */
  topBarLabel?: string;
};

const cardClass = cn(
  `fixed left-[50%] top-[50%] ${overlayZ.radixDialog}`,
  "flex w-[min(calc(100vw-24px),500px)] max-w-[500px] -translate-x-1/2 -translate-y-1/2",
  "flex-col gap-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-0 text-slate-100 shadow-lg",
  "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  "motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
);

const secondaryBtnClass =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2.5 font-body text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";

function DotGridBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundColor: "rgb(2, 6, 23)",
        backgroundImage: "radial-gradient(circle, rgba(148, 163, 184, 0.07) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        WebkitMaskImage:
          "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.12) 35%, rgba(0,0,0,0.02) 60%, rgba(0,0,0,0) 100%)",
        maskImage:
          "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.12) 35%, rgba(0,0,0,0.02) 60%, rgba(0,0,0,0) 100%)",
      }}
      aria-hidden
    />
  );
}

export function OnboardingModal({
  open,
  onClose,
  steps,
  onComplete,
  closeLabel = "Close onboarding modal",
  topBarLabel,
}: OnboardingModalProps) {
  const multiStep = steps.length > 1;
  const [stepIndex, setStepIndex] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (open) {
      setStepIndex(0);
      completedRef.current = false;
    }
  }, [open]);

  const safeIndex = Math.min(stepIndex, Math.max(steps.length - 1, 0));
  const step = steps[safeIndex];
  const isLast = safeIndex >= steps.length - 1;
  const stepNumber = String(safeIndex + 1).padStart(2, "0");
  const stepTotal = String(steps.length).padStart(2, "0");

  function dismiss() {
    onClose();
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }

  function handleOpenChange(next: boolean) {
    if (!next) dismiss();
  }

  if (!step) return null;

  const leftTopBar = topBarLabel ? (
    <p className="font-mono text-xs font-bold uppercase tracking-wide text-white">{topBarLabel}</p>
  ) : multiStep ? (
    <p className="font-mono text-xs uppercase tracking-wide text-slate-500" aria-live="polite">
      {stepNumber} / {stepTotal}
    </p>
  ) : (
    <span className="sr-only">Onboarding</span>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideCloseButton
        className={cardClass}
        overlayClassName={overlayZ.radixDialog}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const root = e.currentTarget;
          if (!(root instanceof HTMLElement)) return;
          const focusTarget = root.querySelector<HTMLElement>("[data-onboarding-primary]");
          focusTarget?.focus({ preventScroll: true });
        }}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800 px-4">
          {leftTopBar}
          <button
            type="button"
            onClick={dismiss}
            className="ml-auto rounded-md p-1 text-slate-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            aria-label={closeLabel}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="relative h-[220px] shrink-0 overflow-hidden border-b border-slate-800 bg-slate-950">
          <DotGridBackdrop />
          <div className="relative z-10 flex h-full items-center justify-center p-6">{step.visual}</div>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-6 bg-gradient-to-b from-black/50 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-6 bg-gradient-to-t from-black/50 to-transparent"
            aria-hidden
          />
        </div>

        <div className="p-6 pb-0">
          {step.label ? (
            <p className="font-mono text-xs uppercase tracking-wide text-slate-500">{step.label}</p>
          ) : null}
          <DialogTitle
            className={cn(
              "font-heading text-2xl font-bold uppercase tracking-[0.08em] text-slate-100",
              step.label ? "mt-2" : null,
            )}
          >
            {step.heading}
          </DialogTitle>
          <DialogDescription className="mt-3 font-body text-sm leading-relaxed text-slate-400">
            {step.body}
          </DialogDescription>

          {multiStep ? (
            <div className="mt-6 flex items-center justify-center gap-1.5" role="tablist" aria-label="Welcome steps">
              {steps.map((_, i) => (
                <span
                  key={i}
                  role="tab"
                  aria-current={i === safeIndex ? "step" : undefined}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    i === safeIndex ? "bg-emerald-500" : "bg-slate-700",
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "flex items-center gap-3 p-6 pt-4",
            multiStep ? "justify-between" : "justify-end",
          )}
        >
          {multiStep && safeIndex > 0 ? (
            <button type="button" className={secondaryBtnClass} onClick={() => setStepIndex((i) => i - 1)}>
              Previous
            </button>
          ) : multiStep ? (
            <span aria-hidden className="min-w-0" />
          ) : null}

          {multiStep ? (
            isLast ? (
              <button type="button" data-onboarding-primary className={secondaryBtnClass} onClick={dismiss}>
                Got it
              </button>
            ) : (
              <button
                type="button"
                data-onboarding-primary
                className={secondaryBtnClass}
                onClick={() => setStepIndex((i) => Math.min(i + 1, steps.length - 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            )
          ) : (
            <button type="button" data-onboarding-primary className={secondaryBtnClass} onClick={dismiss}>
              Got it
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
