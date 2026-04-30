import Image from "next/image";
import Link from "next/link";
import { appWordmarkStyle } from "@/lib/landing/appWordmarkStyle";
import { buildLoginHref } from "@/lib/navigation/loginHref";

export function HeroSection({ nextFromUrl }: { nextFromUrl?: string }) {
  const getStartedHref = buildLoginHref({ register: true, next: nextFromUrl });
  const signInHref = buildLoginHref({ next: nextFromUrl });

  return (
    <section
      className="relative flex min-h-[100dvh] w-full flex-col items-center overflow-x-hidden bg-[#020617] pt-6 pb-14"
      aria-labelledby="landing-hero-headline"
    >
      <svg
        className="pointer-events-none fixed inset-0 z-0 h-screen w-screen"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <pattern id="grid-minor" width="48" height="48" patternUnits="userSpaceOnUse">
            <rect width="48" height="48" fill="none" stroke="rgba(148,163,184,0.04)" strokeWidth="0.5" />
          </pattern>
          <pattern id="grid-major" width="192" height="192" patternUnits="userSpaceOnUse">
            <rect width="192" height="192" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="glow" cx="50%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#059669" stopOpacity="0.025" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="fade" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#020617" stopOpacity="0" />
            <stop offset="50%" stopColor="#020617" stopOpacity="0" />
            <stop offset="100%" stopColor="#020617" stopOpacity="1" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-minor)" />
        <rect width="100%" height="100%" fill="url(#grid-major)" />
        <rect width="100%" height="100%" fill="url(#glow)" />
        <rect width="100%" height="100%" fill="url(#fade)" />
      </svg>
      <div className="relative z-10 mx-auto flex w-full max-w-[428px] flex-1 flex-col">
        <header className="mb-8 text-center">
          <p
            className="font-sans text-[36px] font-bold uppercase leading-none tracking-[1.08px] text-white"
            style={appWordmarkStyle}
          >
            The Sideline
          </p>
        </header>

        <div className="relative -mx-4 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)]">
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#10b981]/5 blur-3xl"
            aria-hidden
          />
          <Image
            src="/onboarding/hero-showcase-mobile.png"
            alt="The Sideline Play Logger mobile showcase with floating stat cards"
            width={592}
            height={740}
            priority
            className="relative z-10 h-auto w-full object-contain"
            sizes="(max-width: 639px) 100vw, 428px"
          />
        </div>

        <div className="mt-5 w-full max-w-[296px] self-center">
          <h1
            id="landing-hero-headline"
            className="text-center font-sans text-2xl font-bold tracking-[0.72px] text-white normal-case"
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
