"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ONBOARDING_SLIDES, ONBOARDING_SLIDE_COUNT } from "@/lib/landing/onboardingSlides";
import type { OnboardingSlide } from "@/lib/landing/onboardingSlides";
import { CarouselDots } from "./CarouselDots";
import { GetStartedButton } from "./GetStartedButton";
import { SignInLink } from "./SignInLink";

/** Time each slide stays on screen before auto-advance (longer = easier to read copy + mockup). */
const AUTO_MS = 10_000;
const PAUSE_MS = 10_000;
const SWIPE_THRESHOLD_PX = 50;
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

/** One swipeable column: mockup panel (image + copy), dots below panel; “The Sideline” is static above the track. */
function CarouselSlidePanel({
  slide,
  imagePriority,
  slideIndex,
  carouselIndex,
  onSelectSlide,
}: {
  slide: OnboardingSlide;
  imagePriority: boolean;
  slideIndex: number;
  carouselIndex: number;
  onSelectSlide: (i: number) => void;
}) {
  const inactive = slideIndex !== carouselIndex;
  return (
    <div className="flex h-full min-h-0 min-w-full w-full max-w-none shrink-0 basis-full flex-col bg-transparent">
      {/* Hero: rounded panel = mockup + copy; dots sit below the panel. */}
      <div className="relative z-10 shrink-0 bg-transparent">
        <div className="flex w-full flex-col items-center px-1 pb-2 pt-0">
          <div className="relative mx-auto w-full max-w-[360px]">
            <div
              className="relative w-full overflow-hidden rounded-xl border border-slate-700 bg-[#020617] py-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.45),0_2px_8px_rgba(0,0,0,0.35)]"
            >
              <Image
                src={slide.imageSrc}
                alt={slide.imageAlt}
                width={slide.imageWidth}
                height={slide.imageHeight}
                priority={imagePriority}
                className="pointer-events-none mx-auto block h-auto max-h-[min(44dvh,540px)] w-full object-contain object-center select-none"
                sizes="(max-width: 640px) 90vw, 360px"
              />
              <div className="space-y-0 px-3 pb-0 pt-[24px] text-center sm:px-4">
                <h2 className="font-sans text-[15px] font-bold leading-snug tracking-[0.6px] text-white sm:text-base">
                  {slide.headline}
                </h2>
                <p className="mt-1.5 line-clamp-4 font-sans text-xs font-normal leading-snug text-[#94a3b8] sm:mt-2 sm:text-sm sm:leading-relaxed">
                  {slide.supporting}
                </p>
              </div>
            </div>
          </div>
          <div
            className="mx-auto mt-[32px] w-full max-w-[360px] px-1"
            aria-hidden={inactive}
            {...(inactive ? { inert: true as const } : {})}
          >
            <CarouselDots
              count={ONBOARDING_SLIDE_COUNT}
              activeIndex={carouselIndex}
              onSelect={onSelectSlide}
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 bg-transparent" aria-hidden />
    </div>
  );
}

export function OnboardingCarousel({ nextFromUrl }: { nextFromUrl?: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [transitionOn, setTransitionOn] = useState(true);
  const pauseUntilRef = useRef(0);
  const indexRef = useRef(0);
  const touchStartX = useRef<number | null>(null);

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
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setTransitionOn(true));
      });
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
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setTransitionOn(true));
      });
      return;
    }
    setTransitionOn(true);
    setIndex(i - 1);
  }, [bumpPause]);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;
      const i = indexRef.current;
      if (i === ONBOARDING_SLIDE_COUNT - 1) {
        setTransitionOn(false);
        setIndex(0);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => setTransitionOn(true));
        });
        return;
      }
      setTransitionOn(true);
      setIndex(i + 1);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

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
    if (dx < -SWIPE_THRESHOLD_PX) goNext();
    else if (dx > SWIPE_THRESHOLD_PX) goPrev();
  }

  const durationClass = reducedMotion || !transitionOn ? "duration-0" : "duration-[300ms]";
  const easeClass = "ease-out";

  return (
    <section
      className="relative flex h-dvh max-h-dvh w-full max-w-none flex-col overflow-hidden"
      style={{
        backgroundColor: "#020617",
        /* Match globals `body::before`: dot grid, then centered vignette (transparent outside so dots show through). */
        backgroundImage: [
          "radial-gradient(ellipse min(34vmin, 15rem) min(40vmin, 18rem) at 50% 50%, rgba(51, 65, 85, 0.28) 0%, rgba(30, 41, 59, 0.1) 48%, rgba(5, 150, 105, 0.04) 62%, transparent 72%)",
          "radial-gradient(circle, rgba(148, 163, 184, 0.07) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "auto, 24px 24px",
      }}
      aria-roledescription="carousel"
      aria-label="The Sideline onboarding"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header className="relative z-20 mb-[48px] shrink-0 bg-transparent px-1 pt-8 text-center sm:pt-10">
        <p
          className="font-sans text-[36px] font-bold uppercase leading-none tracking-[1.08px] text-white"
          style={{
            textShadow: "0px 0px 24px rgba(51, 65, 85, 0.3)",
            filter: "drop-shadow(0px 0px 12px #1f3d35)",
          }}
        >
          The Sideline
        </p>
        <p className="mt-3 font-sans text-sm font-medium leading-snug text-[#94a3b8] sm:text-[15px]">
          Study your game. Call it smarter.
        </p>
      </header>

      <div className="relative z-0 min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-hidden bg-transparent">
        <div
          className={`relative z-10 flex h-full min-h-0 w-full min-w-0 items-stretch bg-transparent ${durationClass} ${easeClass} will-change-transform`}
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {ONBOARDING_SLIDES.map((slide, slideIndex) => (
            <CarouselSlidePanel
              key={slide.id}
              slide={slide}
              imagePriority={slideIndex === 0}
              slideIndex={slideIndex}
              carouselIndex={index}
              onSelectSlide={goTo}
            />
          ))}
        </div>
      </div>

      <footer className="relative z-30 shrink-0 bg-transparent px-1 pb-[calc(32px+env(safe-area-inset-bottom,0px))] pt-2">
        <div className="mx-auto flex w-full max-w-[360px] flex-col gap-3 sm:gap-4">
          <GetStartedButton next={nextFromUrl} />
          <SignInLink next={nextFromUrl} />
        </div>
      </footer>

      <p className="sr-only" aria-live="polite">
        Slide {index + 1} of {ONBOARDING_SLIDE_COUNT}: {ONBOARDING_SLIDES[index]?.headline}
      </p>
    </section>
  );
}
