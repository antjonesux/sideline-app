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
    <div className="relative flex min-h-[min(640px,calc(100dvh-10rem))] flex-col">
      <div className="pointer-events-none absolute left-1/2 top-[min(7rem,18vw)] z-0 h-64 w-[min(118%,26rem)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_45%,rgba(16,185,129,0.07),transparent_72%)]" />

      <Button
        type="button"
        variant="ghost"
        className="absolute right-0 top-0 z-20 h-auto px-1 py-0 font-sans text-sm font-normal text-emerald-400 hover:bg-transparent hover:text-emerald-300"
        onClick={onDismiss}
      >
        {ONBOARDING_EXPLORE_APP}
      </Button>

      <div className="relative z-[1] mt-8 flex flex-1 flex-col">
        <div
          className="flex flex-1 flex-col gap-5 touch-pan-y"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="region"
          aria-roledescription="carousel"
          aria-label="Product overview"
        >
          <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-none">
            <div className="relative aspect-[16/11] w-full min-h-[200px] max-h-[min(52vw,300px)]">
              <Image
                src={slide.imageSrc}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 42rem"
                className="object-cover object-top"
                priority={index === 0}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[38%] bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent"
                aria-hidden
              />
            </div>
          </div>

          <h2 className="font-heading text-center text-2xl font-bold text-white">{slide.title}</h2>
          <p className="font-body mx-auto max-w-md text-center text-base leading-relaxed text-slate-400 line-clamp-2">
            {slide.body}
          </p>

          <div className="flex justify-center gap-1 pb-1" role="tablist" aria-label="Slides">
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
                    i === index ? "h-2 w-6 bg-emerald-400" : "h-2 w-2 bg-slate-600 hover:bg-slate-500",
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
