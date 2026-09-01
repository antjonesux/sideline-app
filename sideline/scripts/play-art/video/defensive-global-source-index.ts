/**
 * Diagnostic index over existing CFB27 defensive staging cards.
 * Recovery layer only — does not ingest new source material.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { normalizePlayName } from "../../../lib/utils";
import { formationOcrSupportsTarget } from "./defensive-formation-evidence";
import { recoveryNeedleOrSourceGroundedMatch } from "./defensive-recovery-needles";
import {
  DEFENSIVE_REUSE_GAME_VERSION,
  DEFENSIVE_REUSE_SIDE,
  isDirectValidatedArtCard,
  isValidatedReusableArtCard,
  listDefensivePlaybookSlugs,
} from "./defensive-art-reuse";
import type { ManualSupplementReport } from "./process-supplements";
import type { CardSourceType, ExtractedVideoCard, VideoPrepareReport } from "./types";

/** Labeled headers often embed the play name on line 2 of formation OCR. */
export function extractPlayOcrCandidates(entry: {
  playNameOcr?: string | null;
  playNameOcrRaw?: string | null;
  formationOcrRaw?: string;
}): string[] {
  const out: string[] = [];
  const push = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (trimmed) out.push(trimmed);
  };

  push(entry.playNameOcr);
  if (entry.playNameOcrRaw && entry.playNameOcrRaw !== entry.playNameOcr) {
    push(entry.playNameOcrRaw);
  }

  const lines = (entry.formationOcrRaw ?? "")
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length >= 2) {
    push(lines.slice(1).join(" "));
    for (let i = 1; i < lines.length; i += 1) push(lines[i]!);
  }

  return [...new Set(out)];
}

export type SourceValidationStatus =
  | "validated"
  | "unresolved"
  | "rejected"
  | "invalid";

export type IndexedSourceCard = {
  gameVersion: string;
  side: "defense";
  sourcePlaybookSlug: string;
  sourcePlaybookDisplayName: string;
  sourceType: CardSourceType;
  sourceFile: string;
  cardPosition: ExtractedVideoCard["cardPosition"];
  sourceCardPath: string;
  artCropPath: string;
  formationOcrRaw: string;
  formationOcr: string;
  playNameOcrRaw: string | null;
  playNameOcr: string | null;
  matchedFormation: string | null;
  matchedPlay: string | null;
  supplementClass: ExtractedVideoCard["supplementClass"] | null;
  validationStatus: SourceValidationStatus;
  card: ExtractedVideoCard;
};

function dedupeKey(card: ExtractedVideoCard): string | null {
  if (card.artCropPath) return `art:${card.artCropPath}`;
  if (card.sourceCardPath) return `src:${card.sourceCardPath}`;
  return null;
}

function classifyValidationStatus(card: ExtractedVideoCard): SourceValidationStatus {
  if (isValidatedReusableArtCard(card)) return "validated";
  if (card.emptySlot || card.screenRejected) return "invalid";
  if (card.supplementClass === "INVALID_SCREEN") return "rejected";
  if (!card.artCropPath || !existsSync(card.artCropPath)) return "invalid";
  if (!card.sourceCardPath || !existsSync(card.sourceCardPath)) return "invalid";
  if (
    card.supplementClass === "OCR_UNRESOLVED" ||
    card.supplementClass === "CATALOG_MISMATCH" ||
    card.supplementClass === "DUPLICATE_EXISTING"
  ) {
    return "unresolved";
  }
  if (isDirectValidatedArtCard(card)) return "validated";
  return "unresolved";
}

function loadPlaybookDisplayName(stagingRoot: string, slug: string): string {
  const supplementPath = join(stagingRoot, "supplement-report.json");
  if (existsSync(supplementPath)) {
    const raw = JSON.parse(readFileSync(supplementPath, "utf8")) as ManualSupplementReport;
    if (raw.namespace?.playbookDisplayName) return raw.namespace.playbookDisplayName;
  }
  const reportPath = join(stagingRoot, "report.json");
  if (existsSync(reportPath)) {
    const raw = JSON.parse(readFileSync(reportPath, "utf8")) as VideoPrepareReport;
    if (raw.playbook) return raw.playbook;
  }
  return slug;
}

function collectCardsFromPlaybook(stagingRoot: string, slug: string): ExtractedVideoCard[] {
  const cards: ExtractedVideoCard[] = [];
  const seen = new Set<string>();

  const push = (card: ExtractedVideoCard) => {
    if (card.sourceType === "cross-playbook-reuse") return;
    if (card.sourceType === "recovered-existing-source") return;
    const key = dedupeKey(card);
    if (!key || seen.has(key)) return;
    seen.add(key);
    cards.push(card);
  };

  const supplementPath = join(stagingRoot, "supplement-report.json");
  if (existsSync(supplementPath)) {
    const raw = JSON.parse(readFileSync(supplementPath, "utf8")) as ManualSupplementReport & {
      combinedCards?: ExtractedVideoCard[];
    };
    for (const card of raw.videoOnlyCards ?? []) push(card);
    for (const card of raw.cards ?? []) push(card);
    for (const card of raw.combinedCards ?? []) push(card);
    return cards;
  }

  const reportPath = join(stagingRoot, "report.json");
  if (existsSync(reportPath)) {
    const raw = JSON.parse(readFileSync(reportPath, "utf8")) as VideoPrepareReport;
    for (const card of raw.cards ?? []) push(card);
  }
  return cards;
}

export function buildGlobalDefensiveSourceIndex(playArtRoot: string): IndexedSourceCard[] {
  const stagingParent = join(
    playArtRoot,
    "video-staging",
    DEFENSIVE_REUSE_GAME_VERSION,
    DEFENSIVE_REUSE_SIDE,
  );
  const index: IndexedSourceCard[] = [];

  for (const slug of listDefensivePlaybookSlugs(playArtRoot)) {
    const stagingRoot = join(stagingParent, slug);
    if (!existsSync(stagingRoot) || !statSync(stagingRoot).isDirectory()) continue;
    const displayName = loadPlaybookDisplayName(stagingRoot, slug);
    for (const card of collectCardsFromPlaybook(stagingRoot, slug)) {
      if (card.gameVersion !== DEFENSIVE_REUSE_GAME_VERSION) continue;
      if (card.side !== DEFENSIVE_REUSE_SIDE) continue;
      if (!card.artCropPath || !existsSync(card.artCropPath)) continue;
      if (!card.sourceCardPath || !existsSync(card.sourceCardPath)) continue;

      index.push({
        gameVersion: card.gameVersion,
        side: "defense",
        sourcePlaybookSlug: slug,
        sourcePlaybookDisplayName: displayName,
        sourceType: card.sourceType ?? "video",
        sourceFile: card.sourceFile ?? card.videoFile ?? "",
        cardPosition: card.cardPosition,
        sourceCardPath: card.sourceCardPath,
        artCropPath: card.artCropPath,
        formationOcrRaw: card.formationOcrRaw ?? "",
        formationOcr: card.formationOcr ?? "",
        playNameOcrRaw: card.playNameOcrRaw,
        playNameOcr: card.playNameOcr,
        matchedFormation: card.matchedFormation,
        matchedPlay: card.matchedPlay,
        supplementClass: card.supplementClass ?? null,
        validationStatus: classifyValidationStatus(card),
        card,
      });
    }
  }

  return index.sort((a, b) => {
    const slugCmp = a.sourcePlaybookSlug.localeCompare(b.sourcePlaybookSlug);
    if (slugCmp !== 0) return slugCmp;
    const fileCmp = a.sourceFile.localeCompare(b.sourceFile);
    if (fileCmp !== 0) return fileCmp;
    return a.artCropPath.localeCompare(b.artCropPath);
  });
}

/** Query helper: cards whose stored OCR might relate to a target identity. */
export function filterSourceCandidates(
  index: IndexedSourceCard[],
  targetFormation: string,
  targetPlay: string,
): IndexedSourceCard[] {
  const playNorm = normalizePlayName(targetPlay);
  const playTokens = playNorm.split(/\s+/).filter((t) => t.length >= 3);
  const isGoalLine = /^GOAL LINE/i.test(targetFormation);

  return index.filter((entry) => {
    if (entry.validationStatus === "invalid") return false;
    const playOcr = normalizePlayName(entry.playNameOcr ?? entry.playNameOcrRaw ?? "");
    const formOcr = (entry.formationOcr ?? entry.formationOcrRaw ?? "").toUpperCase();
    const formRawUpper = (entry.formationOcrRaw ?? "").toUpperCase();

    if (entry.matchedFormation === targetFormation && entry.matchedPlay) {
      if (normalizePlayName(entry.matchedPlay) === playNorm) return true;
    }

    if (playOcr && playOcr === playNorm) return true;

    if (playTokens.some((token) => playOcr.includes(token))) return true;

    if (isGoalLine && (/GOAL\s*LINE/i.test(formOcr) || /GOAL\s*LINE/i.test(formRawUpper))) {
      return true;
    }

    if (isGoalLine && targetFormation === "Goal Line 6-2" && /GOAL\s*LINE\s*6\s*2|GOAL\s*LINE\s*62/i.test(formRawUpper)) {
      return true;
    }

    if (formOcr.includes(targetFormation.toUpperCase())) return true;
    if (formRawUpper.includes(targetFormation.toUpperCase())) return true;

    for (const candidate of extractPlayOcrCandidates(entry)) {
      const candidateNorm = normalizePlayName(candidate);
      if (candidateNorm === playNorm) return true;
      if (playTokens.some((token) => candidateNorm.includes(token))) return true;
      if (recoveryNeedleOrSourceGroundedMatch({
        formationOcrRaw: formRawUpper,
        formationOcr: entry.formationOcr ?? "",
        targetFormation,
        targetPlay,
        playOcr: candidate,
        allFormationNames: [],
      })) return true;
    }

    if (
      formationOcrSupportsTarget({
        formationOcrRaw: formRawUpper,
        formationOcr: entry.formationOcr ?? "",
        targetFormation,
        allFormationNames: [],
      })
    ) {
      return true;
    }

    return false;
  });
}
