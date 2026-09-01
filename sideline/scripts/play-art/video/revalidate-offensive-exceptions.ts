/**
 * Re-OCR + re-match offensive staging cards for processing-exception resolution.
 * Diagnostic only — does not publish.
 *
 *   NODE_PATH=./node_modules npx tsx ./scripts/play-art/video/revalidate-offensive-exceptions.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { importSeedModule, referenceFromSeed } from "../build-reference";
import {
  cleanSectionHeaderOcrText,
  matchKnownFormation,
  normalizeFormationOcrText,
  ocrPlayCardHeader,
} from "../formation-ocr";
import { teamSlugToSeedSlug } from "../lib/slug-utils";
import { matchPlayInFormation } from "./ocr-and-catalog";
import { cardIdentityKey, playIdentityKey } from "./process-screenshot-screens";
import type { ExtractedVideoCard } from "./types";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const STAGING_OFFENSE = join(__dirname, "../video-staging/cfb27/offense");

const AFFECTED_SLUGS = [
  "san-diego-state",
  "south-alabama",
  "tcu",
  "texas",
  "toledo",
  "ul-monroe",
  "unlv",
  "utep",
  "utsa",
  "wake-forest",
  "western-michigan",
] as const;

function isChromeNoise(raw: string, formationText: string): boolean {
  return (
    /\bKEY\s+PLAYERS\b/i.test(raw) ||
    /\b\d+\s*PLAYS\b/i.test(formationText) ||
    /\bAVGYDS\b/i.test(formationText)
  );
}

function screenStem(sourceCardPath: string): string {
  const base = basename(sourceCardPath);
  return base.replace(/-(?:left|middle|right)\.(?:jpg|jpeg|png)$/i, "");
}

async function reocrCard(
  card: ExtractedVideoCard,
  knownFormations: string[],
  playsByFormation: Map<string, string[]>,
): Promise<ExtractedVideoCard> {
  if (!card.sourceCardPath || !existsSync(card.sourceCardPath) || card.emptySlot) {
    return card;
  }

  const buf = readFileSync(card.sourceCardPath);
  let ocr: { rawText: string; formationText: string; playNameText: string | null };
  try {
    ocr = await ocrPlayCardHeader(buf);
  } catch {
    return card;
  }

  const formationCleaned = cleanSectionHeaderOcrText(ocr.formationText || ocr.rawText);
  const formationMatch = matchKnownFormation(formationCleaned, knownFormations);
  let formationName = formationMatch.matchedFormation;
  let formationMatchConfidence = formationMatch.matchConfidence;

  let matchedPlay: string | null = null;
  let playMatchConfidence: ExtractedVideoCard["playMatchConfidence"] = "skipped";
  if (formationName) {
    const plays = playsByFormation.get(formationName) ?? [];
    const playMatch = matchPlayInFormation(ocr.playNameText, plays);
    matchedPlay = playMatch.matchedPlay;
    playMatchConfidence = playMatch.matchConfidence;
  } else if (ocr.playNameText) {
    playMatchConfidence = "none";
  }

  const chrome = isChromeNoise(ocr.rawText, ocr.formationText);
  if (chrome) {
    formationName = null;
    formationMatchConfidence = "none";
    matchedPlay = null;
    playMatchConfidence = "none";
  }

  const catalogValid =
    formationMatchConfidence !== "none" &&
    matchedPlay != null &&
    (playMatchConfidence === "exact" || playMatchConfidence === "fuzzy");

  return {
    ...card,
    formationOcrRaw: ocr.rawText,
    formationOcr: ocr.formationText || normalizeFormationOcrText(ocr.rawText),
    playNameOcrRaw: ocr.playNameText,
    playNameOcr: ocr.playNameText,
    matchedFormation: formationName,
    formationMatchConfidence,
    matchedPlay,
    playMatchConfidence,
    catalogValid,
  };
}

function classifySupplementCard(
  card: ExtractedVideoCard,
  ownedKeys: Set<string>,
  screenInvalid: boolean,
): ExtractedVideoCard["supplementClass"] {
  if (card.emptySlot) return "EMPTY_SLOT";
  if (screenInvalid) return "INVALID_SCREEN";
  if (!card.matchedFormation || card.formationMatchConfidence === "none") {
    if (card.playNameOcr) return "OCR_UNRESOLVED";
    return "OCR_UNRESOLVED";
  }
  if (
    !card.playNameOcr ||
    !card.playNameOcr.trim() ||
    card.playMatchConfidence === "none" ||
    card.playMatchConfidence === "skipped"
  ) {
    return "OCR_UNRESOLVED";
  }
  const key =
    card.catalogValid && card.matchedFormation && card.matchedPlay
      ? playIdentityKey(card.matchedFormation, card.matchedPlay)
      : null;
  if (key && ownedKeys.has(key)) return "DUPLICATE_EXISTING";
  if (card.catalogValid && key) return "NEW_MISSING_PLAY";
  return "OCR_UNRESOLVED";
}

async function revalidateSlug(slug: string): Promise<number> {
  const stagingRoot = join(STAGING_OFFENSE, slug);
  const seedSlug = teamSlugToSeedSlug(slug, "cfb27");
  const seed = await importSeedModule(seedSlug);
  const reference = referenceFromSeed(seed);
  const knownFormations = reference.formations.map((f) => f.name);
  const playsByFormation = new Map(
    reference.formations.map((f) => [f.name, f.plays] as const),
  );

  const videoPath = join(stagingRoot, "report.json");
  const supplementPath = join(stagingRoot, "supplement-report.json");
  let changed = 0;

  if (existsSync(videoPath)) {
    const videoReport = JSON.parse(readFileSync(videoPath, "utf8")) as {
      cards?: ExtractedVideoCard[];
    };
    const cards = videoReport.cards ?? [];
    const recapturePath = join(stagingRoot, "recapture-queue.json");
    const missingForms = new Set<string>();
    if (existsSync(recapturePath)) {
      const rq = JSON.parse(readFileSync(recapturePath, "utf8")) as {
        formationsToRecapture?: Array<{ formation: string }>;
      };
      for (const row of rq.formationsToRecapture ?? []) {
        missingForms.add(row.formation);
      }
    }

    for (let i = 0; i < cards.length; i += 1) {
      const card = cards[i];
      const shouldReocr =
        !card.catalogValid ||
        (card.matchedFormation && missingForms.has(card.matchedFormation));
      if (!shouldReocr || !card.sourceCardPath) continue;
      const updated = await reocrCard(card, knownFormations, playsByFormation);
      if (JSON.stringify(updated) !== JSON.stringify(card)) {
        cards[i] = updated;
        changed += 1;
      }
    }
    writeFileSync(videoPath, `${JSON.stringify({ ...videoReport, cards }, null, 2)}\n`);
  }

  if (existsSync(supplementPath)) {
    const supplement = JSON.parse(readFileSync(supplementPath, "utf8")) as {
      cards?: ExtractedVideoCard[];
      videoOnlyCards?: ExtractedVideoCard[];
    };
    delete (supplement as { combinedCards?: unknown }).combinedCards;
    const videoOnly = supplement.videoOnlyCards ?? [];
    const ownedKeys = new Set<string>();
    for (const card of videoOnly) {
      const key = cardIdentityKey(card);
      if (key) ownedKeys.add(key);
    }
    for (const card of existsSync(videoPath)
      ? ((JSON.parse(readFileSync(videoPath, "utf8")) as { cards?: ExtractedVideoCard[] })
          .cards ?? [])
      : []) {
      const key = cardIdentityKey(card);
      if (key) ownedKeys.add(key);
    }

    const cards = supplement.cards ?? [];
    const byScreen = new Map<string, ExtractedVideoCard[]>();
    for (const card of cards) {
      if (!card.sourceCardPath) continue;
      const stem = screenStem(card.sourceCardPath);
      const group = byScreen.get(stem) ?? [];
      group.push(card);
      byScreen.set(stem, group);
    }

    for (const [, group] of byScreen) {
      const updatedGroup: ExtractedVideoCard[] = [];
      for (const card of group) {
        updatedGroup.push(await reocrCard(card, knownFormations, playsByFormation));
      }

      const formationNames = updatedGroup
        .filter((c) => !c.emptySlot && c.matchedFormation)
        .map((c) => c.matchedFormation as string);
      const uniqueFormations = new Set(formationNames);
      const screenInvalid =
        formationNames.length >= 2 && uniqueFormations.size > 1;

      for (const card of updatedGroup) {
        const idx = cards.findIndex(
          (c) => c.sourceCardPath === card.sourceCardPath && c.cardPosition === card.cardPosition,
        );
        if (idx < 0) continue;
        const supplementClass = classifySupplementCard(card, ownedKeys, screenInvalid);
        const next = { ...card, supplementClass, screenRejected: screenInvalid };
        if (JSON.stringify(next) !== JSON.stringify(cards[idx])) {
          cards[idx] = next;
          changed += 1;
          if (supplementClass === "NEW_MISSING_PLAY" && next.catalogValid) {
            const key = cardIdentityKey(next);
            if (key) ownedKeys.add(key);
          }
        }
      }
    }

    writeFileSync(
      supplementPath,
      `${JSON.stringify({ ...supplement, cards }, null, 2)}\n`,
    );
  }

  return changed;
}

async function main(): Promise<void> {
  let total = 0;
  for (const slug of AFFECTED_SLUGS) {
    const n = await revalidateSlug(slug);
    console.log(`${slug}: ${n} card(s) updated`);
    total += n;
  }
  console.log(`Total cards updated: ${total}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
