import { ArrowRight, CheckCircle, X } from "lucide-react";
import { SectionBadge } from "@/components/marketing/SectionBadge";

const ROWS = [
  { traditional: "Hundreds of plays", sideline: "Your best plays" },
  { traditional: "Constant scrolling", sideline: "Organized by situation" },
  { traditional: "Difficult to remember", sideline: "Built before kickoff" },
  { traditional: "Generic organization", sideline: "Ready when you need it" },
] as const;

export function WhatIsCallSheet() {
  return (
    <section id="about" className="scroll-mt-24 px-6 py-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/40 px-6 py-28">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <SectionBadge>The Concept</SectionBadge>
          <h2 className="mt-5 font-heading text-4xl font-extrabold normal-case tracking-tight text-white lg:text-5xl">
            What is a Call Sheet?
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            A Call Sheet is a coach&apos;s game plan — a curated list of the plays they trust most, organized by
            situation. The Sideline brings that same workflow to EA SPORTS College Football, helping you find the right
            play in seconds instead of scrolling through an entire playbook.
          </p>
        </div>

        <div className="mx-auto max-w-2xl">
          <div className="mb-3 grid px-1" style={{ gridTemplateColumns: "1fr 40px 1fr" }}>
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Traditional Playbook</div>
            <div />
            <div className="text-right font-mono text-[10px] uppercase tracking-widest text-emerald-500">
              The Sideline
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-700/50">
            {ROWS.map(({ traditional, sideline }, i) => (
              <div
                key={traditional}
                className="grid"
                style={{
                  gridTemplateColumns: "1fr 40px 1fr",
                  borderBottom: i < ROWS.length - 1 ? "1px solid rgb(30 41 59 / 0.5)" : "none",
                }}
              >
                <div className="flex items-center gap-3 bg-white/[0.02] px-4 py-4">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                    <X size={9} className="text-red-500" aria-hidden />
                  </div>
                  <span className="text-sm text-slate-400">{traditional}</span>
                </div>

                <div className="flex items-center justify-center border-x border-slate-800 bg-emerald-500/[0.03]">
                  <ArrowRight size={12} className="text-emerald-500/35" aria-hidden />
                </div>

                <div className="flex items-center gap-3 bg-emerald-500/[0.04] px-4 py-4">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                    <CheckCircle size={9} className="text-emerald-500" aria-hidden />
                  </div>
                  <span className="text-sm font-medium text-slate-100">{sideline}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
