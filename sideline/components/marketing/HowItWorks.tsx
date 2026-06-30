import { ListChecks, Zap } from "lucide-react";
import { SectionBadge } from "@/components/marketing/SectionBadge";

function StepOneUi() {
  const situations = ["Go-To Plays", "Red Zone", "Tempo", "Take a Shot"];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900">
      <div className="border-b border-slate-800 bg-slate-950 px-4 py-3">
        <span className="font-mono text-xs uppercase tracking-widest text-emerald-500">Call Sheet Builder</span>
      </div>
      <div className="space-y-2 p-4">
        {situations.map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
              i === 0
                ? "border border-emerald-500/20 bg-emerald-500/10"
                : "border border-transparent bg-white/[0.04]"
            }`}
          >
            <div className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-emerald-500" : "bg-slate-500"}`} />
            <span
              className={`font-heading text-xs font-medium normal-case tracking-normal ${
                i === 0 ? "text-emerald-500" : "text-slate-400"
              }`}
            >
              {s}
            </span>
            {i === 0 ? <span className="ml-auto font-mono text-[10px] text-emerald-500">3 plays</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepTwoUi() {
  const situations = [
    "Go-To Plays",
    "Tempo",
    "Run Game",
    "Pass Game",
    "Man Beaters",
    "Zone Beaters",
    "Red Zone",
    "Take a Shot",
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950 px-4 py-3">
        <ListChecks size={11} className="text-emerald-500" aria-hidden />
        <span className="font-mono text-xs uppercase tracking-widest text-emerald-500">Situations</span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2">
          {situations.map((s, i) => (
            <div
              key={s}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-heading text-[10px] normal-case tracking-normal ${
                i < 3 ? "bg-emerald-500/10 text-emerald-500" : "bg-white/[0.04] text-slate-400"
              }`}
            >
              <div className={`h-1 w-1 shrink-0 rounded-full ${i < 3 ? "bg-emerald-500" : "bg-slate-500"}`} />
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepThreeUi() {
  const plays = [
    { name: "4 Verts", note: "go-to" },
    { name: "Mesh", note: "quick" },
    { name: "Y Cross", note: "reliable" },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950 px-4 py-3">
        <Zap size={11} className="text-emerald-500" aria-hidden />
        <span className="font-mono text-xs uppercase tracking-widest text-emerald-500">Quick Access</span>
      </div>
      <div className="p-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">3rd &amp; Long</div>
        <div className="space-y-1.5">
          {plays.map(({ name, note }) => (
            <div
              key={name}
              className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2"
            >
              <span className="font-heading text-xs font-medium normal-case tracking-normal text-slate-100">
                {name}
              </span>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-500">
                {note}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    num: "01",
    title: "Build your Call Sheet",
    body: "Browse your playbook and organize your favorite plays into tactical situations. Your game plan starts taking shape before kickoff.",
    ui: <StepOneUi />,
  },
  {
    num: "02",
    title: "Prepare your strategy",
    body: "Build Go-To Plays, Tempo, Run Game, Pass Game, Man Beaters, Zone Beaters, Red Zone, and Take a Shot packages — each situation covered.",
    ui: <StepTwoUi />,
  },
  {
    num: "03",
    title: "Call with confidence",
    body: "Open your Call Sheet during gameplay and quickly reference your game plan without searching through the entire playbook. Your best plays, always ready.",
    ui: <StepThreeUi />,
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 border-y border-slate-700/50 bg-slate-900/40 py-28"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-20 text-center">
          <SectionBadge>How It Works</SectionBadge>
          <h2 className="mt-5 font-heading text-4xl font-extrabold normal-case tracking-tight text-white lg:text-5xl">
            Three steps to a smarter game.
          </h2>
        </div>

        <div className="space-y-20">
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className={`grid items-center gap-12 lg:grid-cols-2 ${i % 2 === 1 ? "lg:grid-flow-dense" : ""}`}
            >
              <div className={i % 2 === 1 ? "lg:col-start-2" : ""}>
                <div className="mb-4 font-heading text-7xl font-extrabold normal-case leading-none tracking-tight text-emerald-500/10">
                  {step.num}
                </div>
                <h3 className="mb-4 font-heading text-2xl font-bold normal-case tracking-normal text-white lg:text-3xl">
                  {step.title}
                </h3>
                <p className="text-base leading-relaxed text-slate-400">{step.body}</p>
              </div>
              <div className={`max-w-sm ${i % 2 === 1 ? "lg:col-start-1 lg:row-start-1" : ""}`}>{step.ui}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
