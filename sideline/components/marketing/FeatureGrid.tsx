import { Layers, Shield, Target, Zap } from "lucide-react";
import { SectionBadge } from "@/components/marketing/SectionBadge";

const FEATURES = [
  {
    icon: Target,
    title: "Digital Call Sheets",
    body: "Create personalized game plans for every offensive playbook. Your call sheet, tailored to how you actually play.",
  },
  {
    icon: Layers,
    title: "Situational Organization",
    body: "Organize your best plays into tactical situations for faster decision making when the game is on the line.",
  },
  {
    icon: Shield,
    title: "Built for College Football",
    body: "Designed specifically for EA SPORTS College Football players. Not a generic football app.",
  },
  {
    icon: Zap,
    title: "Fast During Gameplay",
    body: "Find your best plays in seconds without digging through an entire playbook. Your game plan is always one tap away.",
  },
] as const;

export function FeatureGrid() {
  return (
    <section id="features" className="scroll-mt-24 mx-auto max-w-6xl px-6 py-28">
      <div className="mb-16 text-center">
        <SectionBadge>Features</SectionBadge>
        <h2 className="mt-5 font-heading text-4xl font-extrabold normal-case tracking-tight text-white lg:text-5xl">
          Everything you need to build a smarter game plan.
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border border-slate-700/50 bg-slate-900 p-6 transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 transition-colors group-hover:bg-emerald-500/20">
              <f.icon size={18} className="text-emerald-500" aria-hidden />
            </div>
            <h3 className="mb-2 font-heading text-lg font-bold normal-case tracking-normal text-white">{f.title}</h3>
            <p className="text-sm leading-relaxed text-slate-400">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
