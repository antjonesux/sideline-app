/** Tendencies hero + ranked plays — matches MyTendenciesHeroStats + TopPlaysList. */
export function TendenciesOnboardingMockup() {
  const topPlays = [
    { formation: "Gun Trips", play: "MESH", tds: 2, firsts: 5, uses: 8, avg: "8.4" },
    { formation: "Spread", play: "FLOOD", tds: 1, firsts: 3, uses: 5, avg: "12.1" },
  ];

  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 pt-3 shadow-lg">
      <div className="grid grid-cols-3 gap-1.5 border-b border-slate-800 px-2 pb-2">
        {[
          { label: "WIN RATE", value: "71%", desc: "5W – 2L" },
          { label: "AVG YPP", value: "6.4", desc: "Yards per play" },
          { label: "RUN / PASS", value: "42% / 58%", desc: "Play type split" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex min-h-[72px] flex-col rounded-lg border border-slate-700 bg-slate-900 p-2"
          >
            <p className="font-mono text-[8px] font-medium uppercase tracking-wide text-slate-500">
              {stat.label}
            </p>
            <p className="mt-1 font-heading text-sm font-bold leading-none tracking-wide text-slate-100 tabular-nums">
              {stat.value}
            </p>
            <p className="mt-auto pt-1 font-body text-[9px] leading-snug text-slate-500">{stat.desc}</p>
          </div>
        ))}
      </div>
      <div className="px-2 py-1">
        <p className="px-0.5 py-1.5 font-mono text-[9px] font-medium uppercase tracking-wide text-slate-500">
          Top plays
        </p>
        {topPlays.map((row, i) => (
          <div key={row.play} className="border-b border-slate-800/90 py-2 last:border-0">
            <div className="flex gap-2">
              <span className="w-4 shrink-0 font-mono text-[11px] tabular-nums text-slate-500">
                {i + 1}.
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-body text-[12px] leading-snug text-slate-100">
                  <span className="font-normal text-slate-200">{row.formation}</span>
                  <span className="text-slate-600"> → </span>
                  <span className="font-mono text-[11px] font-medium uppercase text-white">
                    {row.play}
                  </span>
                </p>
                <p className="font-mono text-[10px] leading-relaxed text-slate-400">
                  {row.tds > 0 ? (
                    <>
                      <span className="text-emerald-400">
                        <span className="tabular-nums">{row.tds}</span> TD
                      </span>
                      <span className="mx-1 text-slate-600">·</span>
                    </>
                  ) : null}
                  <span className="tabular-nums">{row.firsts}</span> 1st Downs
                  <span className="mx-1 text-slate-600">·</span>
                  <span className="tabular-nums">{row.uses}</span> calls
                  <span className="mx-1 text-slate-600">·</span>
                  <span className="tabular-nums">{row.avg}</span> avg yds
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WelcomeTendenciesMockup() {
  return <TendenciesOnboardingMockup />;
}
