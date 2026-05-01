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

type Props = {
  onBuildPlan: () => void;
  onDismiss: () => void;
};

export function OnboardingCarousel({ onBuildPlan, onDismiss }: Props) {
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
    if (reducedMotion) return;
    const t = window.setInterval(() => {
      go(1);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(t);
  }, [go, reducedMotion, index]);

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
    <div className="relative flex min-h-[min(640px,calc(100dvh-6rem))] w-full min-w-0 flex-col">
      {/* Glow scales with viewport; stays behind the card */}
      <div
        className="pointer-events-none absolute left-1/2 top-[clamp(3rem,12vw,5.5rem)] z-0 h-[min(18rem,42vw)] w-[min(92vw,28rem)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_45%,rgba(16,185,129,0.07),transparent_72%)] sm:h-64 sm:w-[26rem]"
        aria-hidden
      />

      <button
        type="button"
        className="absolute right-0 top-0 z-20 bg-transparent pr-[env(safe-area-inset-right,0px)] pt-[env(safe-area-inset-top,0px)] font-sans text-sm font-normal text-emerald-400 no-underline transition-colors hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        onClick={onDismiss}
      >
        {ONBOARDING_EXPLORE_APP}
      </button>

      <div className="relative z-[1] mt-10 flex min-h-0 flex-1 flex-col sm:mt-8">
        <div
          className="flex min-h-0 flex-1 flex-col gap-5 touch-pan-y sm:gap-6"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="region"
          aria-roledescription="carousel"
          aria-label="Product overview"
        >
          {/* Full-width within main padding; capped width on large phones / tablet */}
          <div className="mx-auto w-full max-w-lg shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-none">
            <div className="relative aspect-[16/11] w-full">
              <Image
                src={slide.imageSrc}
                alt=""
                fill
                sizes="(max-width: 640px) min(100vw - 2rem, 32rem), 32rem"
                className="object-cover object-top"
                priority={index === 0}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-10 bg-gradient-to-t from-slate-950 from-25% to-transparent"
                aria-hidden
              />
            </div>
          </div>

          <h2 className="font-heading text-center text-2xl font-bold uppercase tracking-[0.06em] text-white sm:text-[1.65rem]">
            {slide.title}
          </h2>
          <p className="font-body mx-auto max-w-md px-1 text-center text-base leading-6 text-slate-400 sm:px-0">
            {slide.body}
          </p>

          <div className="flex justify-center gap-1 pb-2 sm:pb-4" role="tablist" aria-label="Slides">
            {ONBOARDING_CAROUSEL_SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1}`}
                className={cn(
                  "flex h-10 min-w-8 items-center justify-center rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                )}
                onClick={() => setIndex(i)}
              >
                <span
                  className={cn(
                    "block rounded-full transition-[width,background-color] duration-300 ease-out",
                    i === index ? "h-2 w-6 bg-emerald-500 sm:w-8" : "h-2 w-2 bg-slate-600 hover:bg-slate-500",
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="default"
          className="mt-auto w-full shrink-0 rounded-xl border-0 bg-emerald-500 py-4 font-sans text-base font-bold text-white shadow-none hover:bg-emerald-600 focus-visible:ring-emerald-400/50"
          onClick={onBuildPlan}
        >
          {ONBOARDING_CAROUSEL_CTA}
        </Button>
      </div>
    </div>
  );
}
