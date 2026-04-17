import { ResultBadge } from "@/components/import/ResultBadge";
import type { DataTableColumn } from "@/components/shared/DataTable";
import { formatPlaySnapDnDist } from "@/lib/formatDownDistance";
import { normalizePlayName } from "@/lib/utils";

/** Row shape shared by film drives, tendencies, and CSV import previews. */
export type DrivePlayTableRow = {
  formation: string;
  play_name: string;
  result_tag: string;
  yards_gained: number | null;
  down: number | null;
  distance: number | null;
  is_inches?: boolean | null;
};

export function drivePlayTableColumns(): DataTableColumn<DrivePlayTableRow>[] {
  return [
    {
      key: "down_dist",
      header: "DN & DIST",
      width: "w-[70px]",
      render: (play) => (
        <span className="whitespace-nowrap font-mono text-sm text-slate-400 dark:text-slate-400">
          {formatPlaySnapDnDist(play.down, play.distance, play.is_inches)}
        </span>
      ),
    },
    {
      key: "play",
      header: "PLAY",
      width: "min-w-[160px]",
      render: (play) => (
        <div>
          <div className="font-mono text-sm font-medium text-white">{normalizePlayName(play.play_name)}</div>
          <div className="font-sans text-xs text-slate-500 dark:text-slate-500">{play.formation}</div>
        </div>
      ),
    },
    {
      key: "result",
      header: "RESULT",
      width: "w-[100px]",
      render: (play) => <ResultBadge label={play.result_tag} />,
    },
    {
      key: "yards",
      header: "YDS",
      width: "w-[50px]",
      render: (play) => {
        const y = play.yards_gained ?? 0;
        const tone = y > 0 ? "text-emerald-400" : y < 0 ? "text-red-400" : "text-slate-500 dark:text-slate-500";
        const text = y > 0 ? `+${y}` : String(y);
        return <span className={`font-mono text-sm font-medium ${tone}`}>{text}</span>;
      },
    },
  ];
}
