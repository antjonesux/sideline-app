import type { ReactNode } from "react";

/**
 * Drive accordion play grid — identical on header and every data row.
 * Dn & Dist 70px | Formation 1fr | Play 150px (sm: 200px) | Result 100px | Yds 50px; all left-aligned.
 */
export const DRIVE_PLAY_TABLE_GRID =
  "grid w-full min-w-0 grid-cols-[56px_minmax(170px,1fr)_92px_56px] sm:grid-cols-[70px_minmax(150px,1fr)_minmax(140px,1fr)_110px_72px] gap-x-2 sm:gap-x-3 gap-y-1 px-3 pr-4 items-center justify-items-start text-left" as const;

/** One play row inside `<DrivePlayTable>` (uses divide-y between rows). */
export const DRIVE_PLAY_TABLE_ROW = `${DRIVE_PLAY_TABLE_GRID} py-2` as const;

const headerRowClass =
  `${DRIVE_PLAY_TABLE_GRID} border-b border-slate-800/80 py-2 font-sans text-xs font-medium uppercase tracking-wider text-slate-400`;

/**
 * Scrollable play table: column header + `children` (row elements).
 * Use `DRIVE_PLAY_TABLE_ROW` (+ optional classes) on each row for alignment with the header.
 */
export function DrivePlayTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div className="w-full min-w-[420px] sm:min-w-[560px]">
        <div className={headerRowClass}>
          <span className="whitespace-nowrap">DN & DIST</span>
          <span className="whitespace-nowrap">PLAY</span>
          <span className="hidden whitespace-nowrap sm:block">FORMATION</span>
          <span className="whitespace-nowrap">RESULT</span>
          <span className="whitespace-nowrap">YDS</span>
        </div>
        <div className="divide-y divide-white/[0.04]">{children}</div>
      </div>
    </div>
  );
}
