import { BookOpen, Clock, Layers } from "lucide-react";
import { SectionBadge } from "@/components/marketing/SectionBadge";

const PROBLEMS = [
  {
    icon: Layers,
    title: "Too many plays",
    body: "Remembering hundreds of plays during a game is difficult. The playbook is overwhelming when you need answers fast — on offense and defense.",
  },
  {
    icon: BookOpen,
    title: "No structure behind decisions",
    body: "Most players call the same handful of plays because searching through the playbook takes too long. There's no game plan, no film review, and no tendency study.",
  },
  {
    icon: Clock,
    title: "No preparation loop",
    body: "The best coaches build a plan, call with confidence, review the film, and study what worked. Everyone else improvises — and loses.",
  },
] as const;

export function Problem() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28">
      <div className="mb-16 text-center">
        <SectionBadge>The Problem</SectionBadge>
        <h2 className="mt-5 font-heading text-4xl font-extrabold normal-case tracking-tight text-white lg:text-5xl">
          Calling plays shouldn&apos;t rely on guessing.
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PROBLEMS.map((p) => (
          <div
            key={p.title}
            className="rounded-2xl border border-slate-700/50 bg-slate-900 p-6 transition-all duration-200 hover:-translate-y-1"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <p.icon size={20} className="text-emerald-500" aria-hidden />
            </div>
            <h3 className="mb-2 font-heading text-lg font-bold normal-case tracking-normal text-white">{p.title}</h3>
            <p className="text-sm leading-relaxed text-slate-400">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
