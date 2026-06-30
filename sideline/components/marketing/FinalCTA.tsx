import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildLoginHref } from "@/lib/navigation/loginHref";
import { SectionBadge } from "@/components/marketing/SectionBadge";

export function FinalCTA({ nextFromUrl }: { nextFromUrl?: string }) {
  const signInHref = buildLoginHref({ next: nextFromUrl });
  const getStartedHref = buildLoginHref({ register: true, next: nextFromUrl });

  return (
    <section className="px-6 py-6">
      <div
        className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-700/50 px-6 py-32 text-center"
        style={{
          background: `
          radial-gradient(ellipse 60% 80% at 50% 50%, rgba(16,185,129,0.08) 0%, transparent 70%),
          rgba(15, 23, 42, 0.3)
        `,
        }}
      >
        <div className="mx-auto max-w-2xl">
          <SectionBadge>
            <Star size={10} aria-hidden />
            Ready to start?
          </SectionBadge>
          <h2 className="mt-6 font-heading text-4xl font-extrabold normal-case tracking-tight text-white lg:text-5xl xl:text-6xl">
            Walk into every game with a plan.
          </h2>
          <p className="mt-5 text-lg text-slate-400">
            Create your first Call Sheet in minutes and start calling games with more confidence.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <Button size="lg" className="px-8" asChild>
              <Link href={getStartedHref}>
                Get Started <ArrowRight size={16} aria-hidden />
              </Link>
            </Button>
            <p className="text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                href={signInHref}
                className="text-emerald-500 underline underline-offset-[3px] transition-colors hover:text-emerald-400"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
