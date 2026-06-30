"use client";

import { playTypeBucketBadgeClass } from "@/lib/tendenciesPlayType";
import { summarizeSituationPlayTypeCounts } from "@/lib/situationPlayTypeSummary";
import type { SheetPlayRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

/** Dynamic play-type breakdown for situation headers and toolbars. */
export function SituationPlayTypeSummary({
  plays,
  className,
}: {
  plays: SheetPlayRow[];
  className?: string;
}) {
  const rows = useMemo(() => summarizeSituationPlayTypeCounts(plays), [plays]);

  if (rows.length === 0) return null;

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      aria-label="Play type breakdown"
    >
      {rows.map(({ bucket, count }) => (
        <span
          key={bucket}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide ${playTypeBucketBadgeClass(bucket)}`}
        >
          <span className="tabular-nums">{count}</span>
          <span>{bucket}</span>
        </span>
      ))}
    </div>
  );
}
