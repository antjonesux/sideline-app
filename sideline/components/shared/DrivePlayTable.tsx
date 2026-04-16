import type { ReactNode } from "react";

/**
 * Drive accordion play grid — identical on header and every data row.
 * Dn & Dist 70px | Formation 1fr | Play 150px (sm: 200px) | Result 100px | Yds 50px; all left-aligned.
 */
export const DRIVE_PLAY_TABLE_GRID =
  "grid w-full min-w-0 grid-cols-[70px_1fr_150px_100px_50px] sm:grid-cols-[70px_1fr_200px_100px_50px] gap-x-3 gap-y-1 px-4 items-center justify-items-start text-left" as const;

/** One play row inside `<DrivePlayTable>` (uses divide-y between rows). */
export const DRIVE_PLAY_TABLE_ROW = `${DRIVE_PLAY_TABLE_GRID} py-2` as const;

const headerRowClass =
  `${DRIVE_PLAY_TABLE_GRID} border-b border-slate-800/80 py-2 font-mono text-[11px] font-normal uppercase tracking-wide text-slate-500`;

/**
 * Scrollable play table: column header + `children` (row elements).
 * Use `DRIVE_PLAY_TABLE_ROW` (+ optional classes) on each row for alignment with the header.
 */
export function DrivePlayTable({ children }: { children: ReactNode }) {
  return (
    <div className="app-horizontal-scroll-strip min-w-0">
      <div className="w-full min-w-[500px] sm:min-w-[560px]">
        <div className={headerRowClass}>
          <span>DN & DIST</span>
          <span>Formation</span>
          <span>Play</span>
          <span>Result</span>
          <span>Yds</span>
        </div>
        <div className="divide-y divide-white/[0.04]">{children}</div>
      </div>
    </div>
  );
}
