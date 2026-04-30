import Image from "next/image";
import Link from "next/link";
import { appWordmarkStyle } from "@/lib/landing/appWordmarkStyle";
import { buildLoginHref } from "@/lib/navigation/loginHref";

export function HeroSection({ nextFromUrl }: { nextFromUrl?: string }) {
  const getStartedHref = buildLoginHref({ register: true, next: nextFromUrl });
  const signInHref = buildLoginHref({ next: nextFromUrl });

  return (
    <section
      className="flex min-h-[100dvh] w-full min-w-0 max-w-full flex-col overflow-x-hidden overflow-y-auto bg-[#020617] px-4 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]"
      aria-labelledby="landing-hero-headline"
    >
      <header className="shrink-0 pt-10 text-center">
        <p
          className="font-sans text-[36px] font-bold uppercase leading-none tracking-[1.08px] text-white"
          style={appWordmarkStyle}
        >
          The Sideline
        </p>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative flex min-h-0 w-full min-w-0 flex-1 items-center justify-center overflow-hidden">
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#10b981]/5 blur-3xl"
            aria-hidden
          />
          <Image
            src="/onboarding/hero-showcase.png"
            alt="The Sideline app on a phone with drive stats, play splits, formations, and performance highlights"
            width={836}
            height={1046}
            priority
            className="relative z-10 max-h-full max-w-[min(296px,100%)] object-contain object-center"
            sizes="296px"
          />
        </div>

        <div className="mx-auto mt-8 w-full min-w-0 max-w-[296px] shrink-0">
          <h1
            id="landing-hero-headline"
            className="text-center font-sans text-2xl font-bold leading-tight tracking-[0.72px] text-white normal-case"
          >
            Study your game. Call it smarter.
          </h1>

          <p className="mt-3 text-center font-sans text-sm font-normal leading-5 text-[#94a3b8]">
            The play-calling companion for College Football 26. Build your game plan, track your tendencies, and see
            what&apos;s actually working.
          </p>

          <Link
            href={getStartedHref}
            className="mt-8 flex h-12 w-full items-center justify-center rounded-[8px] bg-[#059669] font-sans text-sm font-semibold leading-5 tracking-[0.42px] text-white transition-colors hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            Get started
          </Link>

          <p className="mt-3 flex min-h-9 w-full flex-wrap items-center justify-center gap-x-1 text-center font-sans text-sm font-medium leading-5 text-[#94a3b8]">
            <span>Already have an account?</span>
            <Link
              href={signInHref}
              className="text-[#10b981] underline decoration-[#10b981] underline-offset-2 transition-colors hover:text-emerald-400 hover:decoration-emerald-400 focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
