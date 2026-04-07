import type { AdjustedSituationalCall } from "@/lib/gamePlanTypes";
import type { DraftPlayRow } from "@/lib/playSheetTypes";
import { PLAY_SHEET_SITUATIONS, situationOrderIndex } from "@/lib/playSheetSituations";
import { SCHEME_IDS } from "@/lib/staticData";
import { suggestCoachingAndCounter } from "@/lib/suggestPlayMetadata";

/** Seeded demo rows: Arbuckle Air Raid vs 4-2-5, Washington State playbook. */
const ARBUCKLE_VS_425_WS: Record<
  string,
  {
    formation: string;
    play_name: string;
    coaching_note: string;
    counter_play: string;
  }
> = {
  "1st & 10": {
    formation: "Gun Empty Base Flex",
    play_name: "Y SHALLOW CROSS",
    coaching_note:
      "Shallow cross attacks the hook/curl zone — LBs can't drop fast enough",
    counter_play: "STICK",
  },
  "2nd & Medium": {
    formation: "Pistol Wing Slot",
    play_name: "READ OPTION WK",
    coaching_note:
      "RPO reads the overhang — if he crashes, QB pulls and throws bubble",
    counter_play: "Y STICK",
  },
  "2nd & Long": {
    formation: "Pistol Wing Slot",
    play_name: "PA DEEP OUT",
    coaching_note:
      "Play action holds the safeties — deep out to the boundary beats Cover 3",
    counter_play: "PA BOOT LT",
  },
  "3rd & Short": {
    formation: "Pistol U Off",
    play_name: "RPO PEEK SLANT FLAT",
    coaching_note:
      "Slant-flat combo — one of the two is always open vs single-high",
    counter_play: "READ OPTION",
  },
  "3rd & Medium": {
    formation: "Gun Empty Base Flex",
    play_name: "LEVELS SWITCH",
    coaching_note:
      "High-low concept attacks zone coverage — the switch creates natural pick",
    counter_play: "MIDDLE HI LO",
  },
  "3rd & Long": {
    formation: "Gun Empty Trips Y Off",
    play_name: "LEVELS SEAM",
    coaching_note:
      "Three levels vs Cover 3 — the seam splits the hook and the deep third",
    counter_play: "RPO ALERT BUBBLE QB POWER",
  },
  "Red Zone": {
    formation: "Pistol Wing Slot",
    play_name: "PA DEEP OUT",
    coaching_note:
      "Play action isolates the boundary WR — back shoulder vs press man",
    counter_play: "HITCH CORNERS",
  },
  "Goal Line": {
    formation: "Pistol U Off",
    play_name: "MTN HB POWER",
    coaching_note:
      "Power blocking at the goal line — numbers advantage vs 5-DB look",
    counter_play: "INSIDE ZONE SPLIT",
  },
  "2-Minute Drill": {
    formation: "Gun Empty Base Flex",
    play_name: "STICK",
    coaching_note:
      "Fast, safe throw to the flat — QB gets the ball out in under 2 seconds",
    counter_play: "WR SCREEN",
  },
  "Backed Up": {
    formation: "Pistol U Off",
    play_name: "HB STRETCH",
    coaching_note:
      "Get outside the box — stretch the defense horizontally before throwing",
    counter_play: "PA BOOT Y DRAG",
  },
};

function callBySituation(
  calls: AdjustedSituationalCall[],
): Map<string, AdjustedSituationalCall> {
  const m = new Map<string, AdjustedSituationalCall>();
  for (const c of calls) {
    m.set(c.situation, c);
  }
  return m;
}

function firstPlayForFormation(
  formation: string,
  byFormation: Map<string, string[]>,
): string {
  const list = byFormation.get(formation);
  if (list?.length) return list[0];
  return "STICK";
}

export function generateDraftPlaySheet(params: {
  offensiveSchemeId: string;
  defensiveScheme: string;
  adjustedCalls: AdjustedSituationalCall[];
  /** formation -> sorted play names from cfb26_plays */
  playsByFormation: Map<string, string[]>;
  /** e.g. Washington State */
  playbook: string;
}): DraftPlayRow[] {
  const {
    offensiveSchemeId,
    defensiveScheme,
    adjustedCalls,
    playsByFormation,
    playbook,
  } = params;

  const callMap = callBySituation(adjustedCalls);
  const useDemo =
    offensiveSchemeId === SCHEME_IDS.arbuckle &&
    defensiveScheme === "4-2-5" &&
    playbook === "Washington State";

  const rows: DraftPlayRow[] = [];

  for (const situation of PLAY_SHEET_SITUATIONS) {
    const order = situationOrderIndex(situation);
    if (useDemo && ARBUCKLE_VS_425_WS[situation]) {
      const d = ARBUCKLE_VS_425_WS[situation];
      rows.push({
        clientKey: crypto.randomUUID(),
        situation,
        situation_order: order,
        play_order: 0,
        formation: d.formation,
        play_name: d.play_name,
        coaching_note: d.coaching_note,
        counter_formation: null,
        counter_play: d.counter_play,
        custom_note: null,
        is_featured:
          situation === "1st & 10" || situation === "3rd & Long" ? true : false,
        is_used: false,
        play_type: null,
      });
      continue;
    }

    const adj = callMap.get(situation);
    const formation =
      adj?.formation ??
      (situation === "Goal Line" || situation === "Backed Up"
        ? "Pistol U Off"
        : "Gun Empty Base Flex");
    const play_name = firstPlayForFormation(formation, playsByFormation);
    const meta = suggestCoachingAndCounter(
      defensiveScheme,
      play_name,
      "Pass",
    );
    rows.push({
      clientKey: crypto.randomUUID(),
      situation,
      situation_order: order,
      play_order: 0,
      formation,
      play_name,
      coaching_note: adj?.rationale ?? meta.coaching_note,
      counter_formation: meta.counter_formation,
      counter_play: meta.counter_play,
      custom_note: null,
      is_featured: false,
      is_used: false,
      play_type: null,
    });
  }

  return rows;
}
