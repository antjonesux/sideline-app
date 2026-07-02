import { MarketingWorkspaceIllustration } from "@/components/marketing/MarketingWorkspaceIllustration";
import { SectionBadge } from "@/components/marketing/SectionBadge";

export function ProductShowcase() {
  return (
    <section className="px-6 py-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/30 px-6 py-28">
        <div className="mb-16 text-center">
          <SectionBadge>Workspace</SectionBadge>
          <h2 className="mt-5 font-heading text-4xl font-extrabold normal-case tracking-tight text-white lg:text-5xl">
            Your Game Day Workspace
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-400">
            Build your Call Sheets, organize them into Schemes, and walk into every game with a plan you trust. Your
            workspace keeps everything you need for game day in one place — from building offensive and defensive game
            plans to making confident play calls on both sides of the ball.
          </p>
        </div>

        <div className="relative">
          <div
            className="pointer-events-none absolute -inset-10"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(16,185,129,0.06) 0%, transparent 70%)",
            }}
            aria-hidden
          />

          <MarketingWorkspaceIllustration />
        </div>
      </div>
    </section>
  );
}
