import { AppMockup } from "@/components/marketing/AppMockup";
import { SectionBadge } from "@/components/marketing/SectionBadge";

const CALLOUTS = [
  { label: "Call Sheet Builder", side: "left" },
  { label: "Browse Playbook", side: "left" },
  { label: "Play Management", side: "left" },
  { label: "Situation Cards", side: "right" },
  { label: "Tactical Buckets", side: "right" },
  { label: "Game Planning", side: "right" },
] as const;

function CalloutChip({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-900 px-3 py-2 font-heading text-xs font-medium normal-case tracking-normal text-slate-400">
      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
      {label}
    </div>
  );
}

export function ProductShowcase() {
  return (
    <section className="border-y border-slate-700/50 bg-slate-900/30 py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <SectionBadge>Product</SectionBadge>
          <h2 className="mt-5 font-heading text-4xl font-extrabold normal-case tracking-tight text-white lg:text-5xl">
            The full picture.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            Every view you need to prepare and execute your game plan — all in one place.
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

          <div className="absolute bottom-0 left-0 top-0 hidden w-[180px] flex-col justify-center gap-4 pr-6 lg:flex">
            {CALLOUTS.filter((c) => c.side === "left").map((c) => (
              <CalloutChip key={c.label} label={c.label} />
            ))}
          </div>

          <div className="lg:mx-[190px]">
            <AppMockup />
          </div>

          <div className="absolute bottom-0 right-0 top-0 hidden w-[180px] flex-col justify-center gap-4 pl-6 lg:flex">
            {CALLOUTS.filter((c) => c.side === "right").map((c) => (
              <CalloutChip key={c.label} label={c.label} />
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2 lg:hidden">
          {CALLOUTS.map((c) => (
            <div
              key={c.label}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700/50 bg-slate-900 px-3 py-1.5 font-heading text-xs normal-case tracking-normal text-slate-400"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              {c.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
