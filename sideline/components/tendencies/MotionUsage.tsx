"use client";

type Props = {
  userPct: number;
  playbookPct: number;
  playbookName: string;
  underutilizing: boolean;
};

export function MotionUsage({ userPct, playbookPct, playbookName, underutilizing }: Props) {
  const body =
    playbookPct < 5
      ? "Motion benchmark unavailable for this playbook sample."
      : underutilizing
        ? `Your playbook has ${playbookPct}% motion plays — you may be underutilizing motion.`
        : "You're making good use of your playbook's motion plays.";

  return (
    <div className="app-card app-card-pad">
      <p className="app-field-label">Pre-snap motion usage</p>
      <p className="font-mono mt-1 text-4xl font-bold tabular-nums text-slate-100">{userPct}%</p>
      <p className="font-body mt-3 text-sm leading-relaxed text-slate-400">
        {playbookName ? <span className="text-slate-500">Playbook: {playbookName}. </span> : null}
        {body}
      </p>
    </div>
  );
}
