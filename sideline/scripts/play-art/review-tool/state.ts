import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const STATE_DIR = join(__dirname, "state");

export type SkippedCase = {
  cropId: string;
  formation: string;
  reason: string;
};

export type ReviewSessionState = {
  playbook: string;
  startedAt: string;
  lastActiveAt: string;
  /** Stable case keys: `${formation}::${cropId}` */
  reviewed: string[];
  skipped: SkippedCase[];
  totalTimeMs: number;
  reviewCount: number;
};

export function caseKey(formation: string, cropId: string): string {
  return `${formation}::${cropId}`;
}

export function statePathForPlaybook(playbook: string): string {
  const slug = playbook.trim().toLowerCase().replace(/\s+/g, "-");
  return join(STATE_DIR, `${slug}.json`);
}

export function loadSessionState(playbook: string): ReviewSessionState {
  const path = statePathForPlaybook(playbook);
  if (!existsSync(path)) {
    const now = new Date().toISOString();
    return {
      playbook,
      startedAt: now,
      lastActiveAt: now,
      reviewed: [],
      skipped: [],
      totalTimeMs: 0,
      reviewCount: 0,
    };
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as ReviewSessionState;
  return {
    playbook: raw.playbook ?? playbook,
    startedAt: raw.startedAt ?? new Date().toISOString(),
    lastActiveAt: raw.lastActiveAt ?? new Date().toISOString(),
    reviewed: Array.isArray(raw.reviewed) ? raw.reviewed : [],
    skipped: Array.isArray(raw.skipped) ? raw.skipped : [],
    totalTimeMs: typeof raw.totalTimeMs === "number" ? raw.totalTimeMs : 0,
    reviewCount: typeof raw.reviewCount === "number" ? raw.reviewCount : 0,
  };
}

export function saveSessionState(state: ReviewSessionState): void {
  mkdirSync(STATE_DIR, { recursive: true });
  state.lastActiveAt = new Date().toISOString();
  writeFileSync(statePathForPlaybook(state.playbook), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function progressFromState(
  state: ReviewSessionState,
  totalCases: number,
): {
  total: number;
  reviewed: number;
  skipped: number;
  remaining: number;
  avgTimeMs: number | null;
  estimatedRemainingMs: number | null;
} {
  const reviewed = state.reviewed.length;
  const skipped = state.skipped.length;
  const done = reviewed + skipped;
  const remaining = Math.max(0, totalCases - done);
  const avgTimeMs =
    state.reviewCount > 0 ? Math.round(state.totalTimeMs / state.reviewCount) : null;
  const estimatedRemainingMs = avgTimeMs != null ? avgTimeMs * remaining : null;
  return {
    total: totalCases,
    reviewed,
    skipped,
    remaining,
    avgTimeMs,
    estimatedRemainingMs,
  };
}
