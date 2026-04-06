import type { DefensiveSchemeProfile } from "@/lib/gamePlanTypes";

export function DefensiveSchemeCard({
  profile,
  vulnerabilitySummary,
}: {
  profile: DefensiveSchemeProfile;
  vulnerabilitySummary: string | null;
}) {
  return (
    <section className="rounded-lg border border-[var(--accent)]/35 bg-[var(--surface)] p-5 shadow-[0_0_0_1px_rgba(45,106,79,0.12)] md:p-6">
      <header className="border-b border-white/10 pb-4">
        <h2 className="font-display text-2xl tracking-wide text-[var(--chalk)] md:text-3xl">
          {profile.scheme_name}
        </h2>
        <p className="mt-2 font-mono text-sm leading-relaxed text-[var(--chalk-soft)]">
          {profile.description}
        </p>
      </header>
      <div className="mt-4 space-y-4 font-mono text-sm">
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
            Coverage tendencies
          </h3>
          <p className="mt-1 leading-relaxed text-[var(--chalk-soft)]">
            {profile.coverage_tendency}
          </p>
        </div>
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
            Pressure tendency
          </h3>
          <p className="mt-2">
            <span className="rounded border border-[var(--amber)]/40 bg-[var(--amber)]/10 px-2 py-1 text-xs text-[var(--amber-soft)]">
              {profile.pressure_tendency}
            </span>
          </p>
        </div>
        {vulnerabilitySummary ? (
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
              Key vulnerability vs your scheme
            </h3>
            <p className="mt-2 leading-relaxed text-[var(--chalk)]">
              {vulnerabilitySummary}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
