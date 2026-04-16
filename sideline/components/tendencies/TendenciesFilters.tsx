"use client";

type Pill = "all" | "last5" | "last10" | "vs";

export type TendenciesFilterParams = {
  pill: Pill;
  opponentTeam: string | null;
  minUses: number;
};

function pillClass(active: boolean) {
  return active
    ? "border-emerald-500/80 bg-emerald-500/15 text-emerald-200"
    : "border-slate-700 bg-slate-900/80 text-slate-400 hover:border-slate-600 hover:text-slate-200";
}

export function buildTendenciesQueryString(f: TendenciesFilterParams): string {
  const sp = new URLSearchParams();
  if (f.pill === "last5") sp.set("scope", "last5");
  else if (f.pill === "last10") sp.set("scope", "last10");
  else if (f.pill === "vs" && f.opponentTeam) {
    sp.set("scope", "opponent");
    sp.set("opponent", f.opponentTeam);
  } else sp.set("scope", "all");
  sp.set("min_uses", String(f.minUses));
  return sp.toString();
}

type Props = {
  value: TendenciesFilterParams;
  onChange: (next: TendenciesFilterParams) => void;
  opponents: string[];
  /** When false, hides the minimum-uses / “Include all” line (e.g. predictability view). */
  showMinUsesLine?: boolean;
};

export function TendenciesFilters({ value, onChange, opponents, showMinUsesLine = true }: Props) {
  const setPill = (pill: Pill) => onChange({ ...value, pill });
  const opponentSelectId = "tendencies-opponent-filter";
  const opponentActive = value.pill === "vs";
  const opponentPillClass = opponentActive ? pillClass(true) : pillClass(false);
  const opponentValue = value.opponentTeam ?? "";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={`min-h-11 rounded-full border px-3 py-2 text-sm font-body ${pillClass(value.pill === "all")}`} onClick={() => setPill("all")}>
          All Games
        </button>
        <button type="button" className={`min-h-11 rounded-full border px-3 py-2 text-sm font-body ${pillClass(value.pill === "last5")}`} onClick={() => setPill("last5")}>
          Last 5
        </button>
        <button type="button" className={`min-h-11 rounded-full border px-3 py-2 text-sm font-body ${pillClass(value.pill === "last10")}`} onClick={() => setPill("last10")}>
          Last 10
        </button>
        <div className="relative">
          <select
            id={opponentSelectId}
            name={opponentSelectId}
            value={opponentValue}
            disabled={opponents.length === 0}
            aria-label="Filter by opponent"
            className={`min-h-11 appearance-none rounded-full border px-3 py-2 pe-9 text-sm font-body ${opponentPillClass} disabled:cursor-not-allowed disabled:opacity-70`}
            onChange={(e) => {
              const nextOpponent = e.target.value || null;
              onChange({ ...value, pill: nextOpponent ? "vs" : "all", opponentTeam: nextOpponent });
            }}
            onFocus={() => {
              if (value.pill !== "vs") onChange({ ...value, pill: "vs" });
            }}
          >
            <option value="">vs Opponent</option>
            {opponents.map((opponent) => (
              <option key={opponent} value={opponent}>
                {opponent}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-slate-400" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </div>
      </div>
      {showMinUsesLine ? (
        <p className="font-body text-xs text-slate-500">
          Minimum {value.minUses} logged uses per row.{" "}
          {value.minUses > 1 ? (
            <button type="button" className="min-h-11 text-emerald-400/90 underline-offset-2 hover:underline" onClick={() => onChange({ ...value, minUses: 1 })}>
              Include all
            </button>
          ) : (
            <button type="button" className="min-h-11 text-emerald-400/90 underline-offset-2 hover:underline" onClick={() => onChange({ ...value, minUses: 3 })}>
              Default threshold (3+)
            </button>
          )}
        </p>
      ) : null}
    </div>
  );
}
