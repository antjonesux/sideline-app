import {
  BUILDER_SITUATION_GRID_MOCK,
  COACH_VIEW_SECTIONS_MOCK,
  MarketingAddPlayIllustration,
  MarketingCoachViewIllustration,
  MarketingSituationGridIllustration,
} from "@/components/marketing/MarketingCallSheetIllustrations";
import { SectionBadge } from "@/components/marketing/SectionBadge";

const STEPS = [
  {
    num: "01",
    title: "Build your Call Sheets",
    body: "Browse your playbook and organize your favorite plays into custom situations — on offense and defense. Your game plan starts taking shape before kickoff.",
    ui: <MarketingAddPlayIllustration />,
  },
  {
    num: "02",
    title: "Prepare your strategy",
    body: "Build Go-To Plays, Tempo, Run Game, Pass Game, Man Beaters, Zone Beaters, Take a Shot, and Redzone packages — every situation covered, both sides of the ball.",
    ui: (
      <MarketingSituationGridIllustration
        situations={BUILDER_SITUATION_GRID_MOCK}
        label="Situations"
      />
    ),
  },
  {
    num: "03",
    title: "Group into a Scheme",
    body: "Pair your offensive and defensive call sheets into a named scheme. One tap gives you both sides of the ball, ready for game day.",
    ui: (
      <MarketingCoachViewIllustration
        sections={COACH_VIEW_SECTIONS_MOCK}
        label="Scheme"
        sheetTitle="Base vs Spread"
      />
    ),
  },
  {
    num: "04",
    title: "Call with confidence",
    body: "Open your Call Sheet during gameplay and reference your game plan in seconds. Your best plays on offense and defense, always ready.",
    ui: (
      <MarketingCoachViewIllustration
        sections={COACH_VIEW_SECTIONS_MOCK}
        label="Coach View"
      />
    ),
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 px-6 py-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/40 px-6 py-28">
        <div className="mb-20 text-center">
          <SectionBadge>How It Works</SectionBadge>
          <h2 className="mt-5 font-heading text-4xl font-extrabold normal-case tracking-tight text-white lg:text-5xl">
            Four steps to a smarter game.
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
