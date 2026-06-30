import { shouldOverrideCfbPassLabelToRun } from "@/lib/playbook";
import {
  categorizeCfbPlayType,
  derivedRawOverridesCatalogForTendencies,
  deriveCfbPlayTypeFromName,
  PLAY_TYPE_BUCKET_SUMMARY_ORDER,
  type PlayTypeBucket,
} from "@/lib/tendenciesPlayType";

type SheetPlayLike = {
  play_name: string;
  play_type?: string | null;
};

/** Same bucket ladder as Tendencies `attachPlayTypes`, for sheet rows with catalog `play_type`. */
export function resolveSheetPlayTypeBucket(playName: string, dbPlayType: string | null | undefined): PlayTypeBucket {
  const fromLookup = (dbPlayType ?? "").trim();
  const derived = deriveCfbPlayTypeFromName(playName);
  let raw = fromLookup || derived;
  if (derived && derivedRawOverridesCatalogForTendencies(derived)) {
    raw = derived;
  }
  if (fromLookup && shouldOverrideCfbPassLabelToRun(playName, fromLookup)) {
    raw = "inside_run";
  }
  return categorizeCfbPlayType(raw);
}

/** Counts per play-type bucket for the current situation — populated buckets only, highest count first. */
export function summarizeSituationPlayTypeCounts(
  plays: SheetPlayLike[],
): Array<{ bucket: PlayTypeBucket; count: number }> {
  const counts: Record<PlayTypeBucket, number> = {
    Run: 0,
    Pass: 0,
    "Play Action": 0,
    Screen: 0,
    RPO: 0,
    Option: 0,
    Other: 0,
  };

  for (const play of plays) {
    const bucket = resolveSheetPlayTypeBucket(play.play_name, play.play_type);
    counts[bucket] += 1;
  }

  return PLAY_TYPE_BUCKET_SUMMARY_ORDER.map((bucket) => ({ bucket, count: counts[bucket] }))
    .filter((row) => row.count > 0)
    .sort(
      (a, b) =>
        b.count - a.count ||
        PLAY_TYPE_BUCKET_SUMMARY_ORDER.indexOf(a.bucket) - PLAY_TYPE_BUCKET_SUMMARY_ORDER.indexOf(b.bucket),
    );
}
