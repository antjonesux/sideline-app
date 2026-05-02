"use client";

import { Button } from "@/components/ui/button";
import {
  ONBOARDING_CAROUSEL_CTA,
  ONBOARDING_CAROUSEL_SLIDES,
  ONBOARDING_EXPLORE_APP,
} from "@/lib/coachCopy";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_ADVANCE_MS = 4500;
const SWIPE_THRESHOLD_PX = 44;

/**
 * Full-screen layered backdrop (carousel root) — top wash, emerald bloom, bottom depth.
 * Tuned so the whole page feels cinematic without overpowering text or the mock PNG.
 */
const ONBOARDING_PAGE_BACKDROP = [
  "radial-gradient(ellipse 110% 65% at 50% -8%, rgba(71, 85, 105, 0.28) 0%, rgba(51, 65, 85, 0.12) 38%, transparent 58%)",
  "radial-gradient(ellipse 78% 52% at 50% 28%, rgba(16, 185, 129, 0.13) 0%, rgba(16, 185, 129, 0.05) 40%, transparent 68%)",
  "radial-gradient(ellipse 130% 75% at 50% 105%, rgba(51, 65, 85, 0.36) 0%, rgba(30, 41, 59, 0.32) 42%, rgba(2, 6, 23, 0.55) 72%, rgb(2, 6, 23) 100%)",
].join(", ");

type Props = {
  onBuildPlan: () => void;
  onDismiss: () => void;
  /** When true, do not auto-advance slides (stable QA screenshots). */
  disableAutoAdvance?: boolean;
};

export function OnboardingCarousel({ onBuildPlan, onDismiss, disableAutoAdvance = false }: Props) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const go = useCallback((delta: number) => {
    setIndex((i) => {
      const n = ONBOARDING_CAROUSEL_SLIDES.length;
      return (i + delta + n) % n;
    });
  }, []);

  useEffect(() => {
    if (disableAutoAdvance || reducedMotion) return;
    const t = window.setInterval(() => {
      go(1);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(t);
  }, [go, reducedMotion, index, disableAutoAdvance]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const dx = end - start;
    if (dx > SWIPE_THRESHOLD_PX) go(-1);
    else if (dx < -SWIPE_THRESHOLD_PX) go(1);
  };

  const slide = ONBOARDING_CAROUSEL_SLIDES[index];

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col">
      {/* Full-viewport gradient — bypasses <main> padding; removed on unmount */}
      <div
        className="pointer-events-none fixed inset-0 z-[5] min-h-[100dvh] bg-slate-950"
        style={{ backgroundImage: ONBOARDING_PAGE_BACKDROP }}
        aria-hidden
      />
      <div className="relative z-[10] flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="flex min-h-0 flex-1 touch-pan-y flex-col overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="region"
          aria-roledescription="carousel"
          aria-label="Product overview"
        >
        {/* Top zone — shrink-0 only; flex-1 on a sibling would stretch empty space *below* the image */}
        <div className="flex shrink-0 flex-col gap-4 overflow-hidden px-8 pt-[max(1rem,env(safe-area-inset-top,0px))]">
          <div className="inline-flex w-full shrink-0 items-center justify-end gap-2 rounded-lg py-1 pr-[env(safe-area-inset-right,0px)]">
            <button
              type="button"
              className="text-center font-sans text-xs font-medium leading-4 text-slate-400 underline underline-offset-2 transition-colors hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              onClick={onDismiss}
            >
              {ONBOARDING_EXPLORE_APP}
            </button>
          </div>

          {/* Mock stack — backdrop lives on full carousel root */}
          <div className="flex w-full shrink-0 flex-col items-center overflow-hidden pb-0">
            <div className="mx-auto flex w-full max-w-[min(100%,288px)] flex-col overflow-hidden rounded-t-[10px] rounded-b-none leading-none shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]">
              <Image
                src={slide.imageSrc}
                width={288}
                height={576}
                alt=""
                sizes="(max-width: 428px) 90vw, 288px"
                className="block h-auto w-full max-h-[min(24rem,48svh)] rounded-t-2xl rounded-b-none object-contain align-top shadow-[-4px_4px_40px_4px_rgba(0,0,0,0.20)]"
                priority={index === 0}
              />
            </div>
          </div>
        </div>

        {/* Copy + dots — directly under mock; no mt-auto (that was forcing a giant flex gap above this block) */}
        <div className="flex shrink-0 flex-col gap-3 px-8 pt-6 pb-0">
          <div className="flex flex-col gap-3 text-center">
            <h2 className="font-sans text-xl font-bold tracking-wide text-white normal-case">
              {slide.title}
            </h2>
            <p className="font-sans text-sm font-normal leading-5 text-slate-300">{slide.body}</p>
          </div>

          <div
            className="inline-flex items-start justify-center gap-0 self-stretch"
            role="tablist"
            aria-label="Slides"
          >
            {ONBOARDING_CAROUSEL_SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1}`}
                className={cn(
                  "relative flex h-10 w-8 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                )}
                onClick={() => setIndex(i)}
              >
                <span
                  className={cn(
                    "absolute rounded-full transition-[width,height,background-color] duration-300 ease-out",
                    i === index
                      ? "h-1.5 w-8 bg-emerald-500"
                      : "size-1.5 bg-slate-600 hover:bg-slate-500",
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        {/* At least 48px between dots and CTA; flex-1 still absorbs extra viewport height */}
        <div className="min-h-[48px] flex-1 basis-0" aria-hidden />
        </div>

        {/* Pinned bottom CTA — layout column + safe-area bottom (matches app shell pattern) */}
        <div className="shrink-0 px-8 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-0">
          <Button
            type="button"
            variant="default"
            className="w-full rounded-lg border-0 bg-emerald-600 px-4 py-3.5 font-sans text-sm font-semibold leading-5 tracking-wide text-white shadow-none hover:bg-emerald-700 focus-visible:ring-emerald-400/50"
            onClick={onBuildPlan}
          >
            {ONBOARDING_CAROUSEL_CTA}
          </Button>
        </div>
      </div>
    </div>
  );
}
