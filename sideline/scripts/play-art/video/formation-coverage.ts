import { normalizePlayName } from "../../../lib/utils";
import type { PlayArtReference } from "../types";
import type {
  ExtractedVideoCard,
  FormationCoverageRow,
  FormationCoverageStatus,
  MissBreakdown,
  RecaptureQueue,
  RejectedCandidate,
  VideoSideOfBall,
} from "./types";

/**
 * Per-formation coverage vs catalog. Missing plays are for operator recapture
 * guidance only — never used to invent positional identity.
 */
export function buildFormationCoverage(
  reference: PlayArtReference,
  cards: ExtractedVideoCard[],
): FormationCoverageRow[] {
  const rows: FormationCoverageRow[] = [];

  for (const formation of reference.formations) {
    const expectedPlays = formation.plays.length;
    const expectedSet = new Set(formation.plays.map((p) => normalizePlayName(p)));

    const formationCards = cards.filter(
      (c) => !c.screenRejected && c.matchedFormation === formation.name,
    );
    const detectedCardCount = formationCards.filter((c) => !c.emptySlot).length;
    const emptySlotCount = formationCards.filter((c) => c.emptySlot).length;

    const validUnique = new Set<string>();
    let unresolvedCardCount = 0;
    const unexpectedPlays: string[] = [];

    for (const card of formationCards) {
      if (card.emptySlot) continue;
      if (card.catalogValid && card.matchedPlay) {
        validUnique.add(normalizePlayName(card.matchedPlay));
      } else {
        unresolvedCardCount += 1;
        if (card.playNameOcr) unexpectedPlays.push(card.playNameOcr);
      }
    }

    const missingPlays = formation.plays.filter(
      (p) => !validUnique.has(normalizePlayName(p)),
    );
    const missingCatalogPlayCount = missingPlays.length;
    const coveragePct =
      expectedPlays > 0 ? (validUnique.size / expectedPlays) * 100 : 100;

    let status: FormationCoverageStatus;
    if (missingCatalogPlayCount === 0) {
      status = "COMPLETE";
    } else if (
      detectedCardCount >= expectedPlays &&
      unresolvedCardCount > 0
    ) {
      // Enough cards observed; gaps look like OCR failures.
      status = "OCR_REVIEW";
    } else if (
      formationCards.some((c) => c.rejectReason === "FORMATION_DISAGREEMENT")
    ) {
      status = "STRUCTURAL_REVIEW";
    } else {
      status = "INCOMPLETE";
    }

    rows.push({
      formation: formation.name,
      expectedPlays,
      detectedCardCount,
      emptySlotCount,
      catalogValidUniquePlays: validUnique.size,
      unresolvedCardCount,
      missingCatalogPlayCount,
      unexpectedOcrCount: unexpectedPlays.length,
      coveragePct,
      status,
      missingPlays,
      unexpectedPlays,
    });
    void expectedSet;
  }

  return rows;
}

export function buildRecaptureQueue(input: {
  playbook: string;
  gameVersion: string;
  side: VideoSideOfBall;
  formationCoverage: FormationCoverageRow[];
}): RecaptureQueue {
  return {
    playbook: input.playbook,
    gameVersion: input.gameVersion,
    side: input.side,
    formationsToRecapture: input.formationCoverage
      .filter((r) => r.status !== "COMPLETE")
      .map((r) => ({
        formation: r.formation,
        expected: r.expectedPlays,
        detected: r.catalogValidUniquePlays,
        missingPlays: r.missingPlays,
        status: r.status,
      })),
  };
}

export function buildMissBreakdown(input: {
  formationCoverage: FormationCoverageRow[];
  cards: ExtractedVideoCard[];
  rejected: RejectedCandidate[];
}): MissBreakdown {
  const missingCatalogPlays = input.formationCoverage.reduce(
    (n, r) => n + r.missingCatalogPlayCount,
    0,
  );
  let notCaptured = 0;
  let capturedButOcrUnresolved = 0;
  for (const row of input.formationCoverage) {
    if (row.missingCatalogPlayCount === 0) continue;
    const observedSlots = row.detectedCardCount;
    const shortfall = Math.max(0, row.expectedPlays - observedSlots);
    // Plays we never had card slots for.
    notCaptured += Math.min(shortfall, row.missingCatalogPlayCount);
    // Remaining missing after accounting for under-capture → OCR gaps.
    capturedButOcrUnresolved += Math.max(
      0,
      row.missingCatalogPlayCount - shortfall,
    );
  }
  const catalogMismatch = input.cards.filter(
    (c) =>
      !c.emptySlot &&
      !c.screenRejected &&
      !c.catalogValid &&
      c.playNameOcr &&
      c.formationMatchConfidence === "none",
  ).length;

  return {
    missingCatalogPlays,
    notCaptured,
    capturedButOcrUnresolved,
    capturedButRejected: input.rejected.length,
    catalogMismatch,
  };
}
