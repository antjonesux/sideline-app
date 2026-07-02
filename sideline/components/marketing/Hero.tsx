import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authOAuthButtonClass } from "@/lib/constants/designTokens";
import { buildLoginHref } from "@/lib/navigation/loginHref";
import { MARKETING_HERO_SUBTITLE } from "@/lib/marketingHeroCopy";
import {
  CallSheetPanel,
  PlaybookPanel,
  SituationPanel,
} from "@/components/marketing/HeroPanels";
import { SectionBadge } from "@/components/marketing/SectionBadge";

export function Hero({ nextFromUrl }: { nextFromUrl?: string }) {
  const signInHref = buildLoginHref({ next: nextFromUrl });
  const getStartedHref = buildLoginHref({ register: true, next: nextFromUrl });

  return (
    <section className="relative flex min-h-0 flex-col justify-start pt-[4.5rem] md:min-h-screen md:justify-center md:pt-24">
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-4 sm:pt-6 md:py-20">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <SectionBadge>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              EA SPORTS College Football 27
            </SectionBadge>

            <h1 className="mt-6 font-heading text-5xl font-extrabold normal-case leading-[1.05] tracking-tight text-white lg:text-6xl xl:text-7xl">
              Build better <span className="text-emerald-500">game plans.</span> Call smarter plays.
            </h1>

            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-400">{MARKETING_HERO_SUBTITLE}</p>

            <p className="mt-3 text-base font-semibold text-slate-400">
              Stop guessing and <span className="text-emerald-500">start playing with a plan.</span>
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href={getStartedHref}>
                  Get Started <ArrowRight size={15} aria-hidden />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className={authOAuthButtonClass} asChild>
                <Link href={signInHref}>Sign In</Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6">
              {["Free to use", "No credit card", "Built for CFB27"].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-emerald-500" aria-hidden />
                  <span className="font-mono text-xs text-slate-500">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block" style={{ height: 540 }}>
            <div className="absolute right-0 top-[60px] z-20 rotate-[1.5deg]">
              <CallSheetPanel />
            </div>
            <div className="absolute left-0 top-0 z-10 -rotate-2">
              <PlaybookPanel />
            </div>
            <div className="absolute bottom-5 left-5 z-30 -rotate-1">
              <SituationPanel />
            </div>
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 60% 60% at 60% 50%, rgba(16,185,129,0.06) 0%, transparent 70%)",
              }}
              aria-hidden
            />
          </div>
        </div>
      </div>
    </section>
  );
}
