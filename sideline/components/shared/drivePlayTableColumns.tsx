import { ResultBadge } from "@/components/import/ResultBadge";
import type { DataTableColumn } from "@/components/shared/DataTable";
import { formatBallSpot } from "@/lib/fieldPosition";
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
  /** Persisted ending line when the schema provides it (same encoding as `formatBallSpot`). */
  ending_field_position?: number | null;
  /** Film UI: computed from snap + result when `ending_field_position` is absent. */
  ending_absolute_yard?: number | null;
};

export type DrivePlayTableColumnsOptions = {
  /** When false, omits the SPOT column (e.g. formation accordion where space is tight). Default true. */
  includeSpot?: boolean;
};

export function drivePlayTableColumns(
  options?: DrivePlayTableColumnsOptions,
): DataTableColumn<DrivePlayTableRow>[] {
  const includeSpot = options?.includeSpot !== false;

  const columns: DataTableColumn<DrivePlayTableRow>[] = [
    {
      key: "down_dist",
      header: "DN & DIST",
      render: (play) => (
        <span className="whitespace-nowrap font-mono text-sm text-slate-400 dark:text-slate-400">
          {formatPlaySnapDnDist(play.down, play.distance, play.is_inches)}
        </span>
      ),
    },
    {
      key: "play",
      header: "PLAY",
      render: (play) => {
        const name = normalizePlayName(play.play_name);
        return (
          <div className="min-w-0 max-w-full">
            <div className="truncate font-mono text-sm font-medium text-white" title={name}>
              {name}
            </div>
            <div className="truncate font-sans text-xs text-slate-500 dark:text-slate-500" title={play.formation}>
              {play.formation}
            </div>
          </div>
        );
      },
    },
    {
      key: "result",
      header: "RESULT",
      render: (play) => (
        <span className="inline-flex pr-4">
          <ResultBadge label={play.result_tag} />
        </span>
      ),
    },
    ...(includeSpot
      ? ([
          {
            key: "spot",
            header: "SPOT",
            render: (play: DrivePlayTableRow) => (
              <span className="font-mono text-xs text-slate-400 dark:text-slate-400">
                {formatBallSpot(play.ending_field_position ?? play.ending_absolute_yard)}
              </span>
            ),
          },
        ] satisfies DataTableColumn<DrivePlayTableRow>[])
      : []),
    {
      key: "yards",
      header: "YDS",
      ...(includeSpot
        ? {}
        : {
            headerClassName: "text-right",
            cellClassName: "text-right",
          }),
      render: (play) => {
        const y = play.yards_gained ?? 0;
        const tone = y > 0 ? "text-emerald-400" : y < 0 ? "text-red-400" : "text-slate-500 dark:text-slate-500";
        const text = y > 0 ? `+${y}` : String(y);
        const innerClass = includeSpot
          ? `font-mono text-sm font-medium ${tone}`
          : `inline-block w-full text-right font-mono text-sm font-medium tabular-nums ${tone}`;
        return <span className={innerClass}>{text}</span>;
      },
    },
  ];

  return columns;
}
