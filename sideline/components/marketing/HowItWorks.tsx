import {
  MarketingAddPlayIllustration,
  MarketingCoachViewIllustration,
  MarketingFilmRoomIllustration,
  MarketingTendenciesIllustration,
  COACH_VIEW_SECTIONS_MOCK,
} from "@/components/marketing/MarketingCallSheetIllustrations";
import { SectionBadge } from "@/components/marketing/SectionBadge";

const STEPS = [
  {
    num: "01",
    title: "Build",
    body: "Build Call Sheets and Schemes for offense and defense. Browse your playbook, organize your best plays into custom situations, and pair both sides of the ball into a named identity before kickoff.",
    ui: <MarketingAddPlayIllustration label="Call Sheet Builder" />,
  },
  {
    num: "02",
    title: "Call",
    body: "Reference your plan during gameplay in Coach View. Your Go-To Plays, Red Zone packages, and situational calls are one tap away — no scrolling through hundreds of plays mid-drive.",
    ui: (
      <MarketingCoachViewIllustration
        sections={COACH_VIEW_SECTIONS_MOCK}
        label="Coach View"
      />
    ),
  },
  {
    num: "03",
    title: "Study",
    body: "Log your calls and review the film after each game. Film Room captures every drive — formation, play name, yardage, and result — so you know what actually worked when the game is over.",
    ui: <MarketingFilmRoomIllustration />,
  },
  {
    num: "04",
    title: "Improve",
    body: "Study your tendencies across the season to sharpen decisions. Win rate, yards per play, top performers, and play-type mix — surfaced automatically so you walk into the next game smarter.",
    ui: <MarketingTendenciesIllustration />,
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 px-6 py-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/40 px-6 py-28">
        <div className="mb-20 text-center">
          <SectionBadge>How It Works</SectionBadge>
          <h2 className="mt-5 font-heading text-4xl font-extrabold normal-case tracking-tight text-white lg:text-5xl">
            Build. Call. Study. Improve.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
            The full coaching loop — from game plan to film review to tendency study — in four steps.
          </p>
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
