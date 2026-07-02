import Link from "next/link";
import { ArrowRight, Award, Layers, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildLoginHref } from "@/lib/navigation/loginHref";
import { SectionBadge } from "@/components/marketing/SectionBadge";

const VALUES = [
  {
    icon: Award,
    title: "Think like a coordinator",
    body: "Build offensive and defensive game plans before the first snap. Enter every game with a strategy, not just a prayer.",
  },
  {
    icon: Layers,
    title: "Stay organized",
    body: "Keep your best plays exactly where you expect them — grouped into schemes and organized by situation. No more scrolling. No more forgetting.",
  },
  {
    icon: Shield,
    title: "Build confidence",
    body: "Know what you want to call before the situation arrives. Preparation beats improvisation every time.",
  },
] as const;

export function WhySideline({ nextFromUrl }: { nextFromUrl?: string }) {
  const getStartedHref = buildLoginHref({ register: true, next: nextFromUrl });

  return (
    <section className="mx-auto max-w-6xl px-6 py-28">
      <div className="grid items-center gap-16 lg:grid-cols-2">
        <div>
          <SectionBadge>Why The Sideline?</SectionBadge>
          <h2 className="mt-6 font-heading text-4xl font-extrabold normal-case tracking-tight text-white lg:text-5xl">
            Preparation wins games.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            The Sideline helps you prepare before kickoff with a digital Call Sheet built around how you actually play.
            Instead of searching through hundreds of plays during the game, your best calls are already organized and
            ready.
          </p>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link href={getStartedHref}>
                Get Started Free <ArrowRight size={15} aria-hidden />
              </Link>
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="flex gap-4 rounded-2xl border border-slate-700/50 bg-slate-900 p-5 transition-all duration-200 hover:-translate-x-1"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                <v.icon size={20} className="text-emerald-500" aria-hidden />
              </div>
              <div>
                <h3 className="mb-1.5 font-heading font-bold normal-case tracking-normal text-white">{v.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{v.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
