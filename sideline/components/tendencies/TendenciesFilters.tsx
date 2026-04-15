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
  const setPill = (pill: Pill) => {
    if (pill === "vs" && !value.opponentTeam && opponents[0]) {
      onChange({ ...value, pill: "vs", opponentTeam: opponents[0] });
      return;
    }
    onChange({ ...value, pill });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={`rounded-full border px-3 py-1.5 text-sm font-barlow ${pillClass(value.pill === "all")}`} onClick={() => setPill("all")}>
          All Games
        </button>
        <button type="button" className={`rounded-full border px-3 py-1.5 text-sm font-barlow ${pillClass(value.pill === "last5")}`} onClick={() => setPill("last5")}>
          Last 5
        </button>
        <button type="button" className={`rounded-full border px-3 py-1.5 text-sm font-barlow ${pillClass(value.pill === "last10")}`} onClick={() => setPill("last10")}>
          Last 10
        </button>
        <button
          type="button"
          className={`rounded-full border px-3 py-1.5 text-sm font-barlow ${pillClass(value.pill === "vs")}`}
          onClick={() => setPill("vs")}
          disabled={opponents.length === 0}
        >
          vs Opponent
        </button>
        {value.pill === "vs" && opponents.length > 0 ? (
          <select
            className="font-barlow max-w-[200px] rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
            value={value.opponentTeam ?? ""}
            onChange={(e) => onChange({ ...value, opponentTeam: e.target.value || null })}
          >
            {opponents.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      {showMinUsesLine ? (
        <p className="font-barlow text-xs text-slate-500">
          Minimum {value.minUses} logged uses per row.{" "}
          {value.minUses > 1 ? (
            <button type="button" className="text-emerald-400/90 underline-offset-2 hover:underline" onClick={() => onChange({ ...value, minUses: 1 })}>
              Include all
            </button>
          ) : (
            <button type="button" className="text-emerald-400/90 underline-offset-2 hover:underline" onClick={() => onChange({ ...value, minUses: 3 })}>
              Default threshold (3+)
            </button>
          )}
        </p>
      ) : null}
    </div>
  );
}
