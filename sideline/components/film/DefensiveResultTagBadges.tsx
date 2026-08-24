"use client";

import { ResultBadge } from "@/components/import/ResultBadge";
import { DEFENSIVE_RESULT_TAG_LABELS, type DefensiveResultTag } from "@/lib/defensiveResultTags";

type DefensiveResultTagBadgesProps = {
  tags: string[] | null | undefined;
  /** Compact layout for logger stream rows. */
  compact?: boolean;
};

export function DefensiveResultTagBadges({ tags, compact = false }: DefensiveResultTagBadgesProps) {
  const list = tags ?? [];
  if (list.length === 0) {
    return compact ? null : <span className="font-mono text-xs text-slate-500">—</span>;
  }

  return (
    <span className={`inline-flex flex-wrap ${compact ? "max-w-[8rem] gap-1" : "gap-1.5"}`}>
      {list.map((tag) => {
        const upper = tag.toUpperCase() as DefensiveResultTag;
        const label = DEFENSIVE_RESULT_TAG_LABELS[upper] ?? tag.replace(/_/g, " ");
        return (
          <span key={tag} className={compact ? "inline-flex max-w-full truncate" : undefined}>
            <ResultBadge label={label} />
          </span>
        );
      })}
    </span>
  );
}
