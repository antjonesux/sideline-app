import { publicPlaybookSeoYear } from "@/lib/publicPlaybooksPaths";

type PublicPlaybookDetailHeaderProps = {
  name: string;
  sideOfBall: "offense" | "defense";
  /** Team offensive style under the title (e.g. Spread). Omit when missing. */
  offensiveStyle?: string | null;
  /** Comma-separated teams using this defensive scheme. Omit when empty. */
  defensiveTeams?: string | null;
};

export function PublicPlaybookDetailHeader({
  name,
  sideOfBall,
  offensiveStyle,
  defensiveTeams,
}: PublicPlaybookDetailHeaderProps) {
  const sideLabel = sideOfBall === "defense" ? "defensive" : "offensive";
  const year = publicPlaybookSeoYear();
  const offensiveStyleTrimmed = offensiveStyle?.trim() || null;
  const defensiveTeamsTrimmed = defensiveTeams?.trim() || null;
  const styleLine =
    sideOfBall === "defense"
      ? defensiveTeamsTrimmed
        ? `This defensive style is used by: ${defensiveTeamsTrimmed}`
        : null
      : offensiveStyleTrimmed
        ? `Offensive style: ${offensiveStyleTrimmed}`
        : null;

  return (
    <header className="mt-4">
      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-[0.08em] text-white sm:text-3xl">
        {name}
      </h1>
      {styleLine ? (
        <p className="mt-2 font-body text-sm text-slate-300 sm:text-base">{styleLine}</p>
      ) : null}
      <p className={`max-w-2xl text-sm text-slate-400 sm:text-base ${styleLine ? "mt-1.5" : "mt-2"}`}>
        Every formation and play in the {name} {sideLabel} playbook in College Football {year}.
      </p>
    </header>
  );
}
