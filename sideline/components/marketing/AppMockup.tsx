"use client";

import { CheckCircle, Plus } from "lucide-react";
import { useState } from "react";

const SECTIONS = ["Go-To Plays", "Red Zone", "Tempo", "Man Beaters", "Run Game", "Take a Shot"] as const;

type SectionName = (typeof SECTIONS)[number];

const PLAYS: Record<SectionName, { name: string; formation: string; added?: boolean }[]> = {
  "Go-To Plays": [
    { name: "Slot Fade", formation: "Gun Trey", added: true },
    { name: "Y Cross", formation: "Singleback", added: true },
    { name: "PA Post Wheel", formation: "I-Form", added: true },
    { name: "Inside Zone", formation: "Gun Split", added: false },
  ],
  "Red Zone": [
    { name: "FB Dive", formation: "I-Form Tight", added: true },
    { name: "Waggle", formation: "Shotgun Trips", added: true },
    { name: "Corner Route", formation: "Gun Bunch", added: false },
  ],
  Tempo: [
    { name: "Mesh", formation: "4 Verts", added: true },
    { name: "Quick Out", formation: "Spread", added: true },
  ],
  "Man Beaters": [
    { name: "Slot Fade", formation: "Gun Trey", added: true },
    { name: "Dagger", formation: "Shotgun Trips", added: false },
  ],
  "Run Game": [
    { name: "Inside Zone", formation: "I-Form", added: true },
    { name: "Power O", formation: "Strong Close", added: true },
  ],
  "Take a Shot": [
    { name: "Go Route", formation: "4 Verts", added: true },
    { name: "Post Corner", formation: "Gun Spread", added: false },
  ],
};

export function AppMockup() {
  const [activeSection, setActiveSection] = useState<SectionName>("Go-To Plays");
  const sectionPlays = PLAYS[activeSection] ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-xl border border-slate-700/50 bg-slate-950">
      <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3">
        <div className="flex gap-1.5" aria-hidden>
          <div className="h-3 w-3 rounded-full bg-red-500/70" />
          <div className="h-3 w-3 rounded-full bg-amber-500/70" />
          <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
        </div>
        <div className="mx-auto max-w-xs flex-1 rounded-md bg-white/[0.04] px-3 py-1 text-center font-mono text-[11px] text-slate-500">
          thesideline.pro
        </div>
      </div>

      <div className="flex" style={{ minHeight: 380 }}>
        <div className="flex w-[200px] shrink-0 flex-col border-r border-slate-800 bg-slate-950">
          <div className="p-3">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">Call Sheet</div>
            <div className="mb-3 rounded-md bg-emerald-500/10 px-2 py-1.5 font-heading text-xs font-semibold normal-case tracking-normal text-emerald-500">
              Week 7 — vs Alabama
            </div>
          </div>

          <div className="flex-1 space-y-0.5 px-3">
            {SECTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setActiveSection(s)}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left font-heading text-xs normal-case tracking-normal transition-colors ${
                  activeSection === s ? "bg-emerald-500/10 text-emerald-500" : "text-slate-400"
                }`}
              >
                <span>{s}</span>
                {activeSection === s ? <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden /> : null}
              </button>
            ))}
          </div>

          <div className="mt-auto p-3">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">Call Sheets</div>
            {[
              ["vs Alabama", "Active"],
              ["vs Georgia", "Draft"],
            ].map(([name, status]) => (
              <div key={name} className="mb-2 flex items-center justify-between text-[10px]">
                <span className="font-mono text-slate-400">{name}</span>
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[9px] ${
                    status === "Active"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-white/5 text-slate-500"
                  }`}
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-heading text-base font-bold normal-case tracking-normal text-white">
                {activeSection}
              </h3>
              <p className="mt-0.5 font-mono text-[11px] text-slate-500">{sectionPlays.length} plays</p>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-heading text-xs font-semibold normal-case tracking-normal text-emerald-500"
            >
              <Plus size={11} aria-hidden /> Add Play
            </button>
          </div>

          <div className="space-y-2">
            {sectionPlays.map((play) => (
              <div
                key={play.name}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-white/[0.03] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 font-mono text-[10px] text-slate-500">
                    ▶
                  </div>
                  <div>
                    <div className="font-heading text-sm font-semibold normal-case tracking-normal text-slate-100">
                      {play.name}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500">{play.formation}</div>
                  </div>
                </div>
                {play.added ? (
                  <CheckCircle size={14} className="text-emerald-500" aria-hidden />
                ) : (
                  <Plus size={14} className="text-slate-500" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
