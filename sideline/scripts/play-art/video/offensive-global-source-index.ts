/**
 * Diagnostic index over existing CFB27 offensive staging cards.
 * Recovery layer only — does not ingest new source material.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { normalizeCanonicalOffensivePlayName } from "./offensive-canonical-play";
import { normalizePlayOcrText } from "./ocr-and-catalog";
import {
  OFFENSIVE_REUSE_GAME_VERSION,
  OFFENSIVE_REUSE_SIDE,
  isDirectValidatedArtCard,
  isValidatedReusableArtCard,
  listOffensivePlaybookSlugs,
} from "./offensive-art-reuse";
import { loadScreenshotReport } from "./process-screenshot-playbook";
import { listScreenshotImages } from "./process-screenshot-screens";
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
  side: "offense";
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

function collectCardsFromScreenshotStaging(
  playArtRoot: string,
  slug: string,
): ExtractedVideoCard[] {
  const stagingRoot = join(
    playArtRoot,
    "screenshot-staging",
    OFFENSIVE_REUSE_GAME_VERSION,
    OFFENSIVE_REUSE_SIDE,
    slug,
  );
  const report = loadScreenshotReport(stagingRoot);
  return report?.cards ?? [];
}

function indexedSourceFileKey(playbookSlug: string, sourceFile: string): string {
  return `${playbookSlug}\0${basename(sourceFile)}`;
}

export type UnprocessedSourceScreenshot = {
  playbookSlug: string;
  fileName: string;
  sourcePath: string;
};

/** Source-screenshots on disk with no extracted card in video or screenshot staging index. */
export function discoverUnprocessedOffensiveSourceScreenshots(
  playArtRoot: string,
  index: IndexedSourceCard[],
): UnprocessedSourceScreenshot[] {
  const indexedFiles = new Set<string>();
  for (const entry of index) {
    if (entry.sourceFile) {
      indexedFiles.add(indexedSourceFileKey(entry.sourcePlaybookSlug, entry.sourceFile));
    }
  }

  const sourceRoot = join(
    playArtRoot,
    "source-screenshots",
    OFFENSIVE_REUSE_GAME_VERSION,
    OFFENSIVE_REUSE_SIDE,
  );
  if (!existsSync(sourceRoot)) return [];

  const out: UnprocessedSourceScreenshot[] = [];
  for (const slug of readdirSync(sourceRoot).sort()) {
    if (slug.startsWith(".") || slug.endsWith(".md")) continue;
    const folderPath = join(sourceRoot, slug);
    if (!statSync(folderPath).isDirectory()) continue;
    for (const imagePath of listScreenshotImages(folderPath)) {
      const fileName = basename(imagePath);
      if (indexedFiles.has(indexedSourceFileKey(slug, fileName))) continue;
      out.push({ playbookSlug: slug, fileName, sourcePath: imagePath });
    }
  }
  return out;
}

function pushIndexedCard(
  index: IndexedSourceCard[],
  slug: string,
  displayName: string,
  card: ExtractedVideoCard,
): void {
  if (card.gameVersion !== OFFENSIVE_REUSE_GAME_VERSION) return;
  if (card.side !== OFFENSIVE_REUSE_SIDE) return;
  if (!card.artCropPath || !existsSync(card.artCropPath)) return;
  if (!card.sourceCardPath || !existsSync(card.sourceCardPath)) return;

  index.push({
    gameVersion: card.gameVersion,
    side: "offense",
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

export function buildGlobalOffensiveSourceIndex(playArtRoot: string): IndexedSourceCard[] {
  const stagingParent = join(
    playArtRoot,
    "video-staging",
    OFFENSIVE_REUSE_GAME_VERSION,
    OFFENSIVE_REUSE_SIDE,
  );
  const index: IndexedSourceCard[] = [];

  for (const slug of listOffensivePlaybookSlugs(playArtRoot)) {
    const stagingRoot = join(stagingParent, slug);
    if (!existsSync(stagingRoot) || !statSync(stagingRoot).isDirectory()) continue;
    const displayName = loadPlaybookDisplayName(stagingRoot, slug);
    const seen = new Set<string>();
    for (const card of [
      ...collectCardsFromPlaybook(stagingRoot, slug),
      ...collectCardsFromScreenshotStaging(playArtRoot, slug),
    ]) {
      const key = dedupeKey(card);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      pushIndexedCard(index, slug, displayName, card);
    }
  }

  const screenshotSlugs = join(
    playArtRoot,
    "screenshot-staging",
    OFFENSIVE_REUSE_GAME_VERSION,
    OFFENSIVE_REUSE_SIDE,
  );
  if (existsSync(screenshotSlugs)) {
    for (const slug of readdirSync(screenshotSlugs).sort()) {
      if (slug.startsWith(".") || slug.endsWith(".md")) continue;
      const stagingRoot = join(screenshotSlugs, slug);
      if (!statSync(stagingRoot).isDirectory()) continue;
      if (listOffensivePlaybookSlugs(playArtRoot).includes(slug)) continue;
      const displayName = loadPlaybookDisplayName(stagingRoot, slug) || slug;
      const seen = new Set(index.map((e) => dedupeKey(e.card)).filter(Boolean));
      for (const card of collectCardsFromScreenshotStaging(playArtRoot, slug)) {
        const key = dedupeKey(card);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        pushIndexedCard(index, slug, displayName, card);
      }
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

/**
 * Exact-only query: card must carry the expected play identity, not merely the formation.
 * No substring/token fuzzy matching.
 */
export function filterExactSourceCandidates(
  index: IndexedSourceCard[],
  targetFormation: string,
  targetPlay: string,
): IndexedSourceCard[] {
  const playNorm = normalizeCanonicalOffensivePlayName(targetPlay);

  return index.filter((entry) => {
    if (entry.validationStatus === "invalid") return false;

    if (
      entry.matchedFormation === targetFormation &&
      entry.matchedPlay &&
      normalizeCanonicalOffensivePlayName(entry.matchedPlay) === playNorm
    ) {
      return true;
    }

    for (const candidate of extractPlayOcrCandidates(entry)) {
      if (
        normalizeCanonicalOffensivePlayName(normalizePlayOcrText(candidate)) ===
        playNorm
      ) {
        return true;
      }
    }

    return false;
  });
}

/** @deprecated Use filterExactSourceCandidates — kept for test imports. */
export const filterSourceCandidates = filterExactSourceCandidates;
