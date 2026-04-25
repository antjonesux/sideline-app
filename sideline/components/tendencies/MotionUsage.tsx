"use client";

type Props = {
  motionPlays: number;
  totalPlays: number;
  userPct: number;
};

/** Standalone motion summary (counts only; no playbook or coaching copy). */
export function MotionUsage({ motionPlays, totalPlays, userPct }: Props) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <p className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Pre-snap motion usage</p>
      <p className="mt-1 font-heading text-4xl font-bold leading-none tabular-nums text-slate-100">{userPct}%</p>
      <p className="mt-2 font-body text-[13px] font-normal leading-[1.35] text-slate-400">
        {motionPlays.toLocaleString("en-US")} motion plays on {totalPlays.toLocaleString("en-US")} snaps
      </p>
    </div>
  );
}
