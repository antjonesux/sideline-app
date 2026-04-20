import type { Side } from "@/lib/derivePlayContext";

/** Absolute yard line from offense's own goal (1 = own goal, 50 = midfield, 99 = opponent 1). */
export function toAbsoluteYard(side: Side, yardLine1to50: number): number {
  const y = Math.min(50, Math.max(1, Math.round(yardLine1to50)));
  return side === "OWN" ? y : 100 - y;
}

export function fromAbsoluteYard(abs: number): { side: Side; yard_line: number } {
  const clamped = Math.min(99, Math.max(1, Math.round(abs)));
  if (clamped <= 50) return { side: "OWN", yard_line: clamped };
  return { side: "OPP", yard_line: 100 - clamped };
}

/** Display helper: OWN 25 / OPP 43 from internal absolute yard. */
export function formatFieldPositionFromAbsolute(abs: number): string {
  const { side, yard_line } = fromAbsoluteYard(abs);
  return `${side} ${yard_line}`;
}

/** Same as spec: OWN n when abs ≤ 50, else OPP (100 - abs). */
export function formatFieldPosition(absYard: number): string {
  return formatFieldPositionFromAbsolute(absYard);
}

/** Parse editor OWN/OPP +1–50 yard number into absolute yard. */
export function parseFieldPosition(side: Side, number: number): number {
  const n = Math.min(50, Math.max(1, Math.round(number)));
  return toAbsoluteYard(side, n);
}

export function yardsToEndZone(absYard: number): number {
  return Math.max(1, 100 - Math.min(99, Math.max(1, Math.round(absYard))));
}

/** Net yards toward the opponent goal from pre-snap absolute yard to ending OWN/OPP yard line (1–50). */
export function deriveYards(startFP: number, endSide: "OWN" | "OPP", endYard: number): number {
  const clampedYard = Math.min(50, Math.max(1, Math.round(endYard)));
  const endFP = endSide === "OWN" ? clampedYard : 100 - clampedYard;
  const start = Math.min(99, Math.max(1, Math.round(startFP)));
  return endFP - start;
}
