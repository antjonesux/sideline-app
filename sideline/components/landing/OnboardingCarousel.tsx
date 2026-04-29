"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ONBOARDING_SLIDES,
  ONBOARDING_SLIDE_COUNT,
} from "@/lib/landing/onboardingSlides";
import { CarouselDots } from "./CarouselDots";
import { GetStartedButton } from "./GetStartedButton";
import { SignInLink } from "./SignInLink";

/* ─── constants ─────────────────────────────────────────────── */
const AUTO_MS = 10_000;
const PAUSE_MS = 10_000;
const SWIPE_PX = 50;
const FADE_MS = 180; // text crossfade half-duration

/* ─── hooks ─────────────────────────────────────────────────── */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Lags behind `activeIndex` by FADE_MS so we can crossfade:
 *   activeIndex changes → opacity drops to 0
 *   after FADE_MS → displayedIndex catches up → opacity returns to 1
 * When `reducedMotion`, snap index/text immediately (no fade timer).
 */
function useCrossfadeIndex(activeIndex: number, reducedMotion: boolean) {
  const [displayedIndex, setDisplayedIndex] = useState(activeIndex);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayedIndex(activeIndex);
      setVisible(true);
      return;
    }
    if (activeIndex === displayedIndex) {
      setVisible(true);
      return;
    }
    setVisible(false);
    const timer = setTimeout(() => {
      setDisplayedIndex(activeIndex);
    }, FADE_MS);
    return () => clearTimeout(timer);
  }, [activeIndex, displayedIndex, reducedMotion]);

  return { displayedIndex, visible };
}

/* ─── component ─────────────────────────────────────────────── */
export function OnboardingCarousel({
  nextFromUrl,
}: {
  nextFromUrl?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [transitionOn, setTransitionOn] = useState(true);
  const pauseUntilRef = useRef(0);
  const indexRef = useRef(0);
  const touchStartX = useRef<number | null>(null);

  // Crossfade text independently of the sliding image
  const { displayedIndex, visible: textVisible } = useCrossfadeIndex(
    index,
    reducedMotion,
  );
  const displayedSlide = ONBOARDING_SLIDES[displayedIndex]!;

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const bumpPause = useCallback(() => {
    pauseUntilRef.current = Date.now() + PAUSE_MS;
  }, []);

  const goTo = useCallback(
    (next: number) => {
      bumpPause();
      setTransitionOn(true);
      setIndex(next);
    },
    [bumpPause],
  );

  const goNext = useCallback(() => {
    bumpPause();
    const i = indexRef.current;
    if (i === ONBOARDING_SLIDE_COUNT - 1) {
      setTransitionOn(false);
      setIndex(0);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setTransitionOn(true)),
      );
      return;
    }
    setTransitionOn(true);
    setIndex(i + 1);
  }, [bumpPause]);

  const goPrev = useCallback(() => {
    bumpPause();
    const i = indexRef.current;
    if (i === 0) {
      setTransitionOn(false);
      setIndex(ONBOARDING_SLIDE_COUNT - 1);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setTransitionOn(true)),
      );
      return;
    }
    setTransitionOn(true);
    setIndex(i - 1);
  }, [bumpPause]);

  /* auto-advance */
  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;
      const i = indexRef.current;
      if (i === ONBOARDING_SLIDE_COUNT - 1) {
        setTransitionOn(false);
        setIndex(0);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setTransitionOn(true)),
        );
        return;
      }
      setTransitionOn(true);
      setIndex(i + 1);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [reducedMotion]);

  /* swipe */
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX;
    if (end == null) return;
    const dx = end - start;
    if (dx < -SWIPE_PX) goNext();
    else if (dx > SWIPE_PX) goPrev();
  }

  const slideDuration =
    reducedMotion || !transitionOn ? "0ms" : "320ms";

  return (
    <section
      className="relative flex h-dvh max-h-dvh w-full flex-col overflow-hidden"
      style={{
        backgroundColor: "#020617",
        backgroundImage: [
          "radial-gradient(ellipse min(34vmin,15rem) min(40vmin,18rem) at 50% 50%, rgba(51,65,85,0.28) 0%, rgba(30,41,59,0.1) 48%, rgba(5,150,105,0.04) 62%, transparent 72%)",
          "radial-gradient(circle, rgba(148,163,184,0.07) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "auto, 24px 24px",
      }}
      aria-roledescription="carousel"
      aria-label="The Sideline onboarding"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── 1. BRAND ZONE ── */}
      <header
        className="relative z-20 shrink-0 bg-transparent px-1 text-center"
        style={{
          paddingTop: "clamp(24px, 4dvh, 40px)",
          marginBottom: "clamp(16px, 3dvh, 40px)",
        }}
      >
        <p
          className="font-sans text-[36px] font-bold uppercase leading-none tracking-[1.08px] text-white"
          style={{
            textShadow: "0px 0px 24px rgba(51,65,85,0.3)",
            filter: "drop-shadow(0px 0px 12px #1f3d35)",
          }}
        >
          The Sideline
        </p>
        <p className="mt-3 font-sans text-sm font-medium leading-snug text-[#94a3b8] sm:text-[15px]">
          Study your game. Call it smarter.
        </p>
      </header>

      {/* ── 2. IMAGE ZONE (slides horizontally) ── */}
      <div className="relative z-0 mx-auto w-full max-w-[360px] min-h-0 flex-1 overflow-hidden px-1">
        <div
          className="relative h-full overflow-hidden rounded-xl border border-slate-700 bg-[#020617] shadow-[0_8px_32px_rgba(0,0,0,0.45),0_2px_8px_rgba(0,0,0,0.35)]"
        >
          {/* Horizontal sliding track — images only */}
          <div
            className="flex h-full items-stretch will-change-transform"
            style={{
              transform: `translate3d(-${index * 100}%, 0, 0)`,
              transitionProperty: "transform",
              transitionDuration: slideDuration,
              transitionTimingFunction: "ease-out",
            }}
          >
            {ONBOARDING_SLIDES.map((slide, i) => (
              <div
                key={slide.id}
                className="flex min-w-full shrink-0 basis-full items-center justify-center"
                style={{
                  paddingTop: "clamp(12px, 2dvh, 24px)",
                  paddingBottom: "clamp(12px, 2dvh, 24px)",
                  paddingLeft: "4px",
                  paddingRight: "4px",
                }}
              >
                <Image
                  src={slide.imageSrc}
                  alt={slide.imageAlt}
                  width={slide.imageWidth}
                  height={slide.imageHeight}
                  priority={i === 0}
                  className="pointer-events-none block h-auto max-h-full w-full object-contain object-center select-none"
                  sizes="(max-width: 640px) 90vw, 360px"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. CONTENT ZONE (crossfades in place) ── */}
      <div
        className="relative z-10 shrink-0 bg-transparent px-6 text-center"
        style={{ paddingTop: "clamp(16px, 2.5dvh, 28px)" }}
      >
        <div
          className="mx-auto max-w-[360px] transition-opacity ease-in-out"
          style={{
            opacity: textVisible ? 1 : 0,
            transitionDuration: reducedMotion ? "0ms" : `${FADE_MS}ms`,
          }}
        >
          <h2 className="font-sans text-[15px] font-bold leading-snug tracking-[0.6px] text-white sm:text-base">
            {displayedSlide.headline}
          </h2>
          <p className="mt-1.5 line-clamp-4 font-sans text-xs font-normal leading-snug text-[#94a3b8] sm:mt-2 sm:text-sm sm:leading-relaxed">
            {displayedSlide.supporting}
          </p>
        </div>
      </div>

      {/* ── 4. DOTS (navigation separator) ── */}
      <div
        className="relative z-10 shrink-0 bg-transparent"
        style={{
          paddingTop: "clamp(16px, 2.5dvh, 28px)",
          paddingBottom: "clamp(16px, 2.5dvh, 28px)",
        }}
      >
        <div className="mx-auto max-w-[360px] px-1">
          <CarouselDots
            count={ONBOARDING_SLIDE_COUNT}
            activeIndex={index}
            onSelect={goTo}
          />
        </div>
      </div>

      {/* ── 5. CTA ZONE ── */}
      <footer
        className="relative z-30 shrink-0 bg-transparent px-1"
        style={{
          paddingBottom:
            "calc(clamp(20px, 3dvh, 32px) + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="mx-auto flex w-full max-w-[360px] flex-col gap-3 sm:gap-4">
          <GetStartedButton next={nextFromUrl} />
          <SignInLink next={nextFromUrl} />
        </div>
      </footer>

      {/* SR announcement — tracks displayed headline after crossfade */}
      <p className="sr-only" aria-live="polite">
        Slide {displayedIndex + 1} of {ONBOARDING_SLIDE_COUNT}:{" "}
        {ONBOARDING_SLIDES[displayedIndex]?.headline}
      </p>
    </section>
  );
}
