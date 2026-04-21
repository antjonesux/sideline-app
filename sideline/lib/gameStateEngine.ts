import { fromAbsoluteYard, parseFieldPosition, toAbsoluteYard } from "@/lib/fieldPosition";
import type { Side } from "@/lib/derivePlayContext";
import type { Drive } from "@/lib/types";

export type ResultTag =
  | "FIRST_DOWN"
  | "GAIN"
  | "NO_GAIN"
  | "LOSS"
  | "TOUCHDOWN"
  | "INCOMPLETE"
  | "TURNOVER"
  | "PUNT"
  | "FIELD_GOAL";

/** UI / button selection before FIRST_DOWN derivation. */
export type UiResultTag = Exclude<ResultTag, "FIRST_DOWN">;

export interface GameState {
  down: 1 | 2 | 3 | 4;
  distance: number;
  /** When distance is 1, coach-facing "& inches" — still stored as 1 in DB. */
  isInches?: boolean;
  /** Absolute 1–99 from own goal */
  absoluteYard: number;
  driveNumber: number;
  playNumber: number;
}

function clampDistanceToGoal(abs: number, dist: number): number {
  const toGoal = 100 - abs;
  if (abs > 90) return Math.max(1, Math.min(dist, toGoal));
  return Math.max(1, dist);
}

function firstDownDistance(abs: number): number {
  const base = 10;
  if (abs + base > 99) return Math.max(1, 100 - abs);
  return base;
}

function newDriveAfterScore(): Pick<GameState, "down" | "distance" | "absoluteYard" | "isInches"> {
  return {
    down: 1,
    distance: 10,
    isInches: false,
    absoluteYard: parseFieldPosition("OWN", 25),
  };
}

function turnoverDriveState(prevAbs: number, prevDrive: number): GameState {
  const flippedAbs = 100 - prevAbs;
  return {
    down: 1,
    distance: firstDownDistance(flippedAbs),
    isInches: false,
    absoluteYard: flippedAbs,
    driveNumber: prevDrive + 1,
    playNumber: 0,
  };
}

/** Pure: current state at snap + stored result + yards → state after the play. */
export function advanceGameState(
  state: GameState,
  result: ResultTag,
  yards: number,
): GameState {
  const playNumber = state.playNumber + 1;
  const { down, distance, absoluteYard: abs, driveNumber } = state;

  const yardsLost = result === "LOSS" ? Math.abs(yards) : 0;
  const gainYards = result === "GAIN" || result === "FIRST_DOWN" ? Math.max(0, yards) : 0;

  switch (result) {
    case "TOUCHDOWN":
    case "FIELD_GOAL": {
      const next = newDriveAfterScore();
      return {
        ...next,
        driveNumber: driveNumber + 1,
        playNumber,
      };
    }
    case "TURNOVER": {
      const t = turnoverDriveState(abs, driveNumber);
      return { ...t, playNumber };
    }
    case "PUNT": {
      const puntYards = Math.max(0, yards);
      const puntedTo = abs + puntYards;
      if (puntedTo >= 100) {
        const next = newDriveAfterScore();
        return { ...next, driveNumber: driveNumber + 1, playNumber };
      }
      const newAbs = 100 - puntedTo;
      return {
        down: 1,
        distance: firstDownDistance(newAbs),
        isInches: false,
        absoluteYard: newAbs,
        driveNumber: driveNumber + 1,
        playNumber,
      };
    }
    case "FIRST_DOWN": {
      const newAbs = Math.min(99, abs + gainYards);
      return {
        down: 1,
        distance: firstDownDistance(newAbs),
        isInches: false,
        absoluteYard: newAbs,
        driveNumber,
        playNumber,
      };
    }
    case "GAIN": {
      const newAbs = Math.min(99, abs + gainYards);
      if (gainYards >= distance) {
        return {
          down: 1,
          distance: firstDownDistance(newAbs),
          isInches: false,
          absoluteYard: newAbs,
          driveNumber,
          playNumber,
        };
      }
      const nextDown = (down + 1) as 1 | 2 | 3 | 4;
      const nextDist = Math.max(1, distance - gainYards);
      if (nextDown > 4) {
        const t = turnoverDriveState(newAbs, driveNumber);
        return { ...t, playNumber };
      }
      return {
        down: nextDown,
        distance: clampDistanceToGoal(newAbs, nextDist),
        isInches: false,
        absoluteYard: newAbs,
        driveNumber,
        playNumber,
      };
    }
    case "NO_GAIN":
    case "INCOMPLETE": {
      const nextDown = (down + 1) as 1 | 2 | 3 | 4;
      if (nextDown > 4) {
        const t = turnoverDriveState(abs, driveNumber);
        return { ...t, playNumber };
      }
      return {
        down: nextDown,
        distance: clampDistanceToGoal(abs, distance),
        isInches: false,
        absoluteYard: abs,
        driveNumber,
        playNumber,
      };
    }
    case "LOSS": {
      let newAbs = abs - yardsLost;
      if (newAbs < 1) newAbs = 1;
      const nextDown = (down + 1) as 1 | 2 | 3 | 4;
      const nextDist = distance + yardsLost;
      if (nextDown > 4) {
        const t = turnoverDriveState(newAbs, driveNumber);
        return { ...t, playNumber };
      }
      return {
        down: nextDown,
        distance: clampDistanceToGoal(newAbs, nextDist),
        isInches: false,
        absoluteYard: newAbs,
        driveNumber,
        playNumber,
      };
    }
    default:
      return { ...state, playNumber };
  }
}

export function defaultGameState(driveNumber: number): GameState {
  return {
    down: 1,
    distance: 10,
    isInches: false,
    absoluteYard: parseFieldPosition("OWN", 25),
    driveNumber,
    playNumber: 0,
  };
}

/** Next snap before any plays are logged — uses drive starting fields when set, else own 25 / 1st & 10. */
export function snapStateFromDriveStarting(drive: Drive): GameState {
  const driveNumber = drive.drive_number;
  const down = Math.min(4, Math.max(1, drive.starting_down ?? 1)) as 1 | 2 | 3 | 4;
  const distance = Math.max(1, drive.starting_distance ?? 10);
  const isInches = Boolean(drive.is_inches) && distance <= 1;

  const absStored = drive.starting_absolute_yard;
  let absoluteYard: number;
  if (typeof absStored === "number" && absStored >= 1 && absStored <= 99) {
    absoluteYard = absStored;
  } else if (
    (drive.starting_side === "OWN" || drive.starting_side === "OPP") &&
    drive.starting_yard_line != null &&
    drive.starting_yard_line >= 1 &&
    drive.starting_yard_line <= 50
  ) {
    absoluteYard = toAbsoluteYard(drive.starting_side, drive.starting_yard_line);
  } else {
    absoluteYard = parseFieldPosition("OWN", 25);
  }

  return {
    down,
    distance,
    isInches,
    absoluteYard,
    driveNumber,
    playNumber: 0,
  };
}

export function snapStateFromPlay(
  play: {
    down: number;
    distance: number;
    side: Side;
    yard_line: number;
    play_number?: number;
    drive_number?: number | null;
    is_inches?: boolean | null;
  },
  fallbackDriveNumber: number,
): GameState {
  const pn = play.play_number ?? 0;
  return {
    down: Math.min(4, Math.max(1, play.down)) as 1 | 2 | 3 | 4,
    distance: Math.max(1, play.distance),
    isInches: Boolean(play.is_inches) && play.distance <= 1,
    absoluteYard: toAbsoluteYard(play.side, play.yard_line),
    driveNumber: play.drive_number ?? fallbackDriveNumber,
    playNumber: Math.max(0, pn - 1),
  };
}

function normalizeStoredResultTag(tag: string): ResultTag {
  const u = tag.trim().toUpperCase().replace(/\s+/g, "_");
  const map: Record<string, ResultTag> = {
    FIRST_DOWN: "FIRST_DOWN",
    GAIN: "GAIN",
    NO_GAIN: "NO_GAIN",
    LOSS: "LOSS",
    TOUCHDOWN: "TOUCHDOWN",
    INCOMPLETE: "INCOMPLETE",
    TURNOVER: "TURNOVER",
    PUNT: "PUNT",
    FIELD_GOAL: "FIELD_GOAL",
    SACK: "LOSS",
  };
  return map[u] ?? "NO_GAIN";
}

/** Recompute game state after the last play in the list (for next snap). */
/**
 * Absolute yard line after this play (1–99 on field, 100 = end zone for offensive TD/FG).
 * Uses the same snap → advance rules as `replayGameStateFromPlays` so punt, turnover, etc.
 * stay consistent with the engine.
 */
export function absoluteYardAfterLoggedPlay(
  play: {
    down: number;
    distance: number;
    side: Side;
    yard_line: number;
    yards_gained: number | null | undefined;
    result_tag: string;
    is_inches?: boolean | null;
    play_number?: number;
    drive_number?: number | null;
  },
  fallbackDriveNumber: number,
): number {
  const snap = snapStateFromPlay(play, fallbackDriveNumber);
  const tag = normalizeStoredResultTag(play.result_tag);
  const y = play.yards_gained ?? 0;
  const next = advanceGameState(snap, tag, y);
  if (tag === "TOUCHDOWN" || tag === "FIELD_GOAL") return 100;
  return next.absoluteYard;
}

export function replayGameStateFromPlays(
  plays: Array<{
    down: number;
    distance: number;
    side: Side;
    yard_line: number;
    play_number?: number;
    drive_number?: number | null;
    is_inches?: boolean | null;
    result_tag: string;
    yards_gained: number | null | undefined;
  }>,
  driveNumber: number,
  /** When the drive has no plays yet, use this row’s starting_* fields (falls back to own 25 / 1st & 10). */
  driveWhenEmpty: Drive | null = null,
): GameState {
  if (!plays.length) {
    if (driveWhenEmpty && driveWhenEmpty.drive_number === driveNumber) {
      return snapStateFromDriveStarting(driveWhenEmpty);
    }
    return defaultGameState(driveNumber);
  }
  let state = defaultGameState(driveNumber);
  plays.forEach((p, i) => {
    const row = { ...p, play_number: p.play_number ?? i + 1 };
    state = snapStateFromPlay(row, driveNumber);
    const y = p.yards_gained ?? 0;
    state = advanceGameState(state, normalizeStoredResultTag(p.result_tag), y);
  });
  return state;
}

export function deriveStoredResultTag(uiTag: UiResultTag, yardsForGain: number, distanceAtSnap: number): ResultTag {
  if (uiTag === "GAIN" && yardsForGain >= distanceAtSnap) return "FIRST_DOWN";
  return uiTag;
}
